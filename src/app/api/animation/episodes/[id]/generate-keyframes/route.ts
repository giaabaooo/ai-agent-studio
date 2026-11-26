import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnimationAssetType } from "@prisma/client";
import { env } from "@/lib/env";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import { buildSceneKeyframePrompt } from "@/modules/animation/prompt-builder.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const forceRegenerate = body.forceRegenerate !== undefined ? Boolean(body.forceRegenerate) : true;
    const sceneId = body.sceneId as string | undefined;

    const episode = await prisma.animationEpisode.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            series: {
              include: {
                characters: {
                  include: {
                    referenceAssets: {
                      where: { approved: true },
                    },
                  },
                },
              },
            },
          },
        },
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: "Không tìm thấy tập phim" }, { status: 404 });
    }

    const seriesCharacters = episode.season?.series?.characters || [];

    const apiKey = (body.geminiApiKey as string)?.trim() || env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY để tự động sinh ảnh Keyframe với Gemini" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Determine target scenes
    let targetScenes = episode.scenes;
    if (sceneId) {
      targetScenes = episode.scenes.filter((s) => s.id === sceneId);
    } else if (!forceRegenerate) {
      // Only generate for scenes missing an approved KEYFRAME
      targetScenes = episode.scenes.filter(
        (s) => !s.assets.some((a) => a.assetType === AnimationAssetType.KEYFRAME && a.approved)
      );
    }

    // Fallback: if forceRegenerate is true or no scenes matched filter, generate all
    if (targetScenes.length === 0) {
      targetScenes = episode.scenes;
    }

    const keyframesDir = path.join(process.cwd(), "media/animation/keyframes");
    await fs.mkdir(keyframesDir, { recursive: true });

    // Generate sequentially to respect rate limits and ensure stable output
    const results = [];
    for (const scene of targetScenes) {
      const prompt = buildSceneKeyframePrompt(scene, seriesCharacters);

      // Match which characters appear in this scene and attach their approved reference images
      const sceneCombined = `${scene.action} ${scene.setting || ""} ${scene.dialogue || ""}`.toLowerCase();
      const hasTwoSiblings = sceneCombined.includes("hai chị em") || sceneCombined.includes("chị em");

      const characterImageInputs: { type: "image"; mime_type: string; data: string }[] = [];

      for (const char of seriesCharacters) {
        const charNameLower = char.name.toLowerCase();
        let isPresent = false;

        if (charNameLower.includes("mít") || charNameLower.includes("mit")) {
          isPresent = sceneCombined.includes("mít") || sceneCombined.includes("mit") || hasTwoSiblings;
        } else if (charNameLower.includes("na")) {
          isPresent = /\bna\b/i.test(sceneCombined) || sceneCombined.includes("bé na") || sceneCombined.includes("chị na") || hasTwoSiblings;
        } else if (charNameLower.includes("bí bo") || charNameLower.includes("bi bo")) {
          isPresent = sceneCombined.includes("bí bo") || sceneCombined.includes("bi bo") || sceneCombined.includes("cú");
        } else if (charNameLower.includes("bà sen") || charNameLower.includes("ba sen")) {
          isPresent = sceneCombined.includes("bà sen") || sceneCombined.includes("ba sen") || sceneCombined.includes("người bà");
        }

        if (isPresent && char.referenceAssets && char.referenceAssets.length > 0) {
          // Prefer FULL_BODY_FRONT or first approved reference
          const ref =
            char.referenceAssets.find((r) => r.referenceType === "FULL_BODY_FRONT") ||
            char.referenceAssets[0];

          if (ref?.localPath) {
            try {
              const fullRefPath = path.join(process.cwd(), "media", ref.localPath);
              const fileBuf = await fs.readFile(fullRefPath);
              const ext = path.extname(ref.localPath).toLowerCase();
              const mime_type = ext === ".png" ? "image/png" : "image/jpeg";
              characterImageInputs.push({
                type: "image",
                mime_type,
                data: fileBuf.toString("base64"),
              });
            } catch (err) {
              console.warn(`Could not read reference asset ${ref.localPath}:`, err);
            }
          }
        }
      }

      // Prepare Gemini input (Text Prompt + Character Reference Images)
      const inputItems: any[] = [
        { type: "text", text: prompt },
        ...characterImageInputs,
      ];

      // Call Gemini 2.5 Flash Image with 9:16 aspect ratio
      const interaction = await ai.interactions.create({
        model: "gemini-2.5-flash-image",
        input: inputItems,
        response_format: {
          type: "image",
          aspect_ratio: "9:16",
        },
      });

      const outputImage = interaction.output_image;
      if (!outputImage?.data) {
        throw new Error(`Gemini không trả về dữ liệu ảnh cho Cảnh ${scene.orderIndex}`);
      }

      const filename = `ep${episode.number}_scene${scene.orderIndex}_gemini_${Date.now()}.png`;
      const destPath = path.join(keyframesDir, filename);
      const buffer = Buffer.from(outputImage.data, "base64");
      await fs.writeFile(destPath, buffer);
      const stat = await fs.stat(destPath);

      // Clean up previous KEYFRAME assets for this scene so UI only shows the newly approved one
      await prisma.sceneAsset.deleteMany({
        where: {
          sceneId: scene.id,
          assetType: AnimationAssetType.KEYFRAME,
        },
      });

      // Save new approved KEYFRAME asset
      const asset = await prisma.sceneAsset.create({
        data: {
          sceneId: scene.id,
          assetType: AnimationAssetType.KEYFRAME,
          localPath: `animation/keyframes/${filename}`,
          mimeType: "image/png",
          fileSize: stat.size,
          approved: true,
          version: 1,
          metadata: {
            generatedBy: "Google Gemini 2.5 Flash Image",
            aspectRatio: "9:16",
            referenceImagesAttached: characterImageInputs.length,
            prompt,
          },
        },
      });

      results.push({ sceneOrder: scene.orderIndex, asset });
    }

    return NextResponse.json({
      success: true,
      message: `Đã dùng Google Gemini tạo thành công ${results.length} ảnh Keyframe 3D Pixar chuẩn 9:16 đồng bộ tạo hình cho tập ${episode.number}!`,
      generatedCount: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Tạo ảnh keyframe bằng Gemini thất bại" },
      { status: 500 }
    );
  }
}
