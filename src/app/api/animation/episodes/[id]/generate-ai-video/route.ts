import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { animationService } from "@/modules/animation/animation.service";
import { prisma } from "@/lib/db";
import { AnimationAssetType } from "@prisma/client";
import { env } from "@/lib/env";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { existsSync } from "fs";
import { buildSceneKeyframePrompt } from "@/modules/animation/prompt-builder.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const provider = (body.provider as string) || (env.FAL_KEY ? "fal" : "google");

    const { episode, promptBundle } =
      await animationService.getFullEpisodePromptBundle(id);

    const seriesCharacters = (episode as any).season?.series?.characters || [];

    // ==========================================
    // 1. FAL.AI (KLING AI VIDEO / LUMA) PROVIDER
    // ==========================================
    if (provider === "fal") {
      const falKey = (body.falKey as string)?.trim() || env.FAL_KEY;

      if (!falKey) {
        return NextResponse.json(
          {
            success: false,
            code: "MISSING_FAL_KEY",
            error:
              "Chưa cấu hình FAL_KEY. Vui lòng thêm FAL_KEY vào .env.local hoặc nhập trực tiếp.",
            prompt: promptBundle.masterEpisodePrompt,
          },
          { status: 400 }
        );
      }

      // Find best reference image (Mít keyframe / character reference)
      let referenceImageDataUrl: string | null = null;
      const candidatePaths = [
        path.join(process.cwd(), "media/animation/keyframes/ep1_scene1_keyframe_1794810814215_4a32182b38d2.jpg"),
        path.join(process.cwd(), "media/characters/mit_full_body_front.jpg"),
        path.join(process.cwd(), "media/characters/mit_full_body_front.png"),
      ];

      for (const p of candidatePaths) {
        if (existsSync(p)) {
          const buf = await fs.readFile(p);
          const ext = path.extname(p).toLowerCase() === ".png" ? "png" : "jpeg";
          referenceImageDataUrl = `data:image/${ext};base64,${buf.toString("base64")}`;
          break;
        }
      }

      const mode = (body.mode as string) || "all_scenes"; // "all_scenes" or "single"
      const durationPerScene = (body.duration as string) || "10"; // "10" or "5"

      // ----------------------------------------------------
      // Helper function to generate 1 scene video with Kling
      // ----------------------------------------------------
      const generateKlingClip = async (
        sceneOrder: number,
        prompt: string,
        imageDataUrl: string | null
      ) => {
        const falModel = imageDataUrl
          ? "fal-ai/kling-video/v1/standard/image-to-video"
          : "fal-ai/kling-video/v1/standard/text-to-video";

        const payload: Record<string, any> = {
          prompt,
          duration: durationPerScene,
          aspect_ratio: "9:16",
          negative_prompt:
            "morphing, flickering, glitches, jitter, distortion, warped faces, deformed hands, extra limbs, bad anatomy, blur, static image, text, subtitles, watermark, logo, captions, letters, symbols, audio icons",
        };
        if (imageDataUrl) {
          payload.image_url = imageDataUrl;
        }

        const submitRes = await fetch(`https://queue.fal.run/${falModel}`, {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!submitRes.ok) {
          const errJson = await submitRes.json().catch(() => ({}));
          const detail = errJson.detail || submitRes.statusText;
          throw new Error(`Kling Cảnh ${sceneOrder} lỗi: ${detail}`);
        }

        const submitData = await submitRes.json();
        const requestId = submitData.request_id;
        const statusUrl =
          submitData.status_url ||
          `https://queue.fal.run/${falModel}/requests/${requestId}/status`;
        const responseUrl =
          submitData.response_url ||
          `https://queue.fal.run/${falModel}/requests/${requestId}`;

        // Poll up to 180s
        let attempts = 0;
        while (attempts < 36) {
          await new Promise((r) => setTimeout(r, 5000));
          attempts++;

          const checkRes = await fetch(statusUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });

          if (checkRes.ok) {
            const statusData = await checkRes.json();
            if (statusData.status === "COMPLETED") {
              const resultRes = await fetch(responseUrl, {
                headers: { Authorization: `Key ${falKey}` },
              });
              if (resultRes.ok) {
                const resData = await resultRes.json();
                return resData?.video?.url || null;
              }
              break;
            } else if (statusData.status === "FAILED") {
              throw new Error(`Kling Cảnh ${sceneOrder} thất bại: ${statusData.error || "Lỗi xử lý"}`);
            }
          }
        }
        throw new Error(`Kling Cảnh ${sceneOrder} quá thời gian chờ (timeout)`);
      };

      // Find candidate reference image helper
      const findImageForScene = async (scene: any) => {
        // 1. Check if scene has approved KEYFRAME in DB
        const keyframeAsset =
          (await prisma.sceneAsset.findFirst({
            where: {
              sceneId: scene.id,
              assetType: AnimationAssetType.KEYFRAME,
              approved: true,
            },
            orderBy: { version: "desc" },
          })) ||
          (await prisma.sceneAsset.findFirst({
            where: {
              sceneId: scene.id,
              assetType: AnimationAssetType.KEYFRAME,
            },
            orderBy: { version: "desc" },
          }));

        if (keyframeAsset?.localPath) {
          const fullPath = path.join(process.cwd(), "media", keyframeAsset.localPath);
          if (existsSync(fullPath)) {
            const buf = await fs.readFile(fullPath);
            const ext = path.extname(fullPath).toLowerCase() === ".png" ? "png" : "jpeg";
            return `data:image/${ext};base64,${buf.toString("base64")}`;
          }
        }

        // 2. If no keyframe in DB, automatically generate it on the fly with Google Gemini!
        if (env.GEMINI_API_KEY) {
          try {
            const prompt = buildSceneKeyframePrompt(scene, seriesCharacters);
            const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
            const interaction = await geminiClient.interactions.create({
              model: "gemini-2.5-flash-image",
              input: prompt,
            });

            const outputImage = interaction.output_image;
            if (outputImage?.data) {
              const kfDir = path.join(process.cwd(), "media/animation/keyframes");
              await fs.mkdir(kfDir, { recursive: true });
              const kfFilename = `ep${episode.number}_scene${scene.orderIndex}_gemini_${Date.now()}.png`;
              const destKfPath = path.join(kfDir, kfFilename);
              const ab = Buffer.from(outputImage.data, "base64");
              await fs.writeFile(destKfPath, ab);
              const statKf = await fs.stat(destKfPath);

              await prisma.sceneAsset.create({
                data: {
                  sceneId: scene.id,
                  assetType: AnimationAssetType.KEYFRAME,
                  localPath: `animation/keyframes/${kfFilename}`,
                  mimeType: "image/png",
                  fileSize: statKf.size,
                  approved: true,
                  version: 1,
                  metadata: {
                    generatedBy: "Auto Google Gemini 2.5 Flash Image",
                    prompt,
                  },
                },
              });

              return `data:image/png;base64,${outputImage.data}`;
            }
          } catch (autoKfErr) {
            console.warn("Auto keyframe generation with Gemini failed, falling back to references", autoKfErr);
          }
        }

        // 3. Candidate fallbacks if auto generation failed
        const candidatePaths: string[] = [];
        if (scene.orderIndex === 1) {
          candidatePaths.push(
            path.join(process.cwd(), "media/characters/mit_full_body_front.jpg"),
            path.join(process.cwd(), "media/characters/mit_full_body_front.png")
          );
        } else if (scene.orderIndex === 2 || scene.action?.toLowerCase().includes("na")) {
          candidatePaths.push(
            path.join(process.cwd(), "media/characters/na_full_body_front.png"),
            path.join(process.cwd(), "media/characters/mit_full_body_front.jpg")
          );
        } else if (scene.orderIndex === 3 || scene.action?.toLowerCase().includes("bà")) {
          candidatePaths.push(
            path.join(process.cwd(), "media/characters/ba_sen_full_body_front.png"),
            path.join(process.cwd(), "media/characters/mit_full_body_front.jpg")
          );
        } else {
          candidatePaths.push(
            path.join(process.cwd(), "media/characters/mit_full_body_front.jpg"),
            path.join(process.cwd(), "media/characters/mit_full_body_front.png")
          );
        }

        for (const p of candidatePaths) {
          if (existsSync(p)) {
            const buf = await fs.readFile(p);
            const ext = path.extname(p).toLowerCase() === ".png" ? "png" : "jpeg";
            return `data:image/${ext};base64,${buf.toString("base64")}`;
          }
        }
        return null;
      };

      const sanitizeMotionPrompt = (p: string | null | undefined, fallbackAction: string) => {
        if (!p || p.trim() === "") {
          return `Original stylized 3D CGI cartoon animation for children, vertical 9:16 portrait. Disney Pixar animation aesthetic. ACTION: ${fallbackAction}. Smooth natural 3D character animation, expressive cute facial expressions, no text, no subtitles.`;
        }
        return p
          .replace(/AUDIO GUIDE ONLY:.*?(?=(\.|$))/gi, "")
          .replace(/CHARACTER LOCK:.*?(?=(ACTION|CAMERA|LIGHTING|MOTION|$))/gi, "")
          .replace(/SCENE \d+ \([^)]+\)\.?/gi, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      // ========================================================
      // MODE A: ALL SCENES GENERATION & AUTOMATIC FFmpeg STITCH
      // ========================================================
      if (mode === "all_scenes" && episode.scenes.length > 0) {
        const videoDir = path.join(process.cwd(), "media/animation/videos");
        await fs.mkdir(videoDir, { recursive: true });

        // Generate all scenes concurrently (Fal.ai handles up to 10 concurrent requests)
        const sceneResults = await Promise.all(
          episode.scenes.map(async (scene) => {
            const imgDataUrl = await findImageForScene(scene);
            const scenePrompt = sanitizeMotionPrompt(scene.visualPrompt, scene.action);

            const vidUrl = await generateKlingClip(scene.orderIndex, scenePrompt, imgDataUrl);
            if (!vidUrl) throw new Error(`Không nhận được video cho Cảnh ${scene.orderIndex}`);

            // Download video
            const filename = `ep${episode.number}_scene${scene.orderIndex}_kling_${Date.now()}.mp4`;
            const destPath = path.join(videoDir, filename);
            const res = await fetch(vidUrl);
            const arrayBuf = await res.arrayBuffer();
            await fs.writeFile(destPath, Buffer.from(arrayBuf));
            const stat = await fs.stat(destPath);

            // Save RAW_VIDEO asset in DB
            await prisma.sceneAsset.create({
              data: {
                sceneId: scene.id,
                assetType: AnimationAssetType.RAW_VIDEO,
                localPath: `animation/videos/${filename}`,
                mimeType: "video/mp4",
                fileSize: stat.size,
                approved: true,
                version: 2,
                metadata: {
                  generatedBy: "Kling AI Video",
                  durationSec: Number(durationPerScene),
                },
              },
            });

            return { sceneIndex: scene.orderIndex, path: destPath };
          })
        );

        // Concatenate all 4 scene videos with FFmpeg into ONE full episode
        const finalRender = await animationService.renderEpisode(id, {
          replaceNativeAudio: false,
        });

        return NextResponse.json({
          success: true,
          mode: "all_scenes",
          scenesCount: sceneResults.length,
          totalDurationSec: sceneResults.length * Number(durationPerScene),
          render: finalRender,
          message: `Đã tạo thành công ${sceneResults.length} cảnh bằng Kling AI và tự động ghép thành video full tập ${sceneResults.length * Number(durationPerScene)}s!`,
        });
      }

      // ========================================================
      // MODE B: SINGLE SCENE TEST GENERATION (10s)
      // ========================================================
      const targetScene =
        (body.sceneId ? episode.scenes.find((s) => s.id === body.sceneId) : null) ||
        (body.sceneOrder
          ? episode.scenes.find((s) => s.orderIndex === Number(body.sceneOrder))
          : null) ||
        episode.scenes[0];

      const singleImageDataUrl = targetScene ? await findImageForScene(targetScene) : null;
      const singlePrompt =
        (body.prompt as string)?.trim() ||
        sanitizeMotionPrompt(targetScene?.visualPrompt, targetScene?.action || "") ||
        promptBundle.masterEpisodePrompt;

      const singleVidUrl = await generateKlingClip(
        targetScene?.orderIndex || 1,
        singlePrompt,
        singleImageDataUrl
      );

      if (singleVidUrl) {
        const tempPath = path.join(os.tmpdir(), `kling-episode-${id}-${Date.now()}.mp4`);
        const vidFileRes = await fetch(singleVidUrl);
        const arrayBuf = await vidFileRes.arrayBuffer();
        await fs.writeFile(tempPath, Buffer.from(arrayBuf));

        // Save as active render for the full episode player
        const render = await animationService.saveFullEpisodeUploadedVideo(
          id,
          tempPath,
          `kling-ai-episode-${episode.number}.mp4`
        );

        // Also save to targetScene RAW_VIDEO so that scene asset list reflects it
        if (targetScene) {
          const videoDir = path.join(process.cwd(), "media/animation/videos");
          await fs.mkdir(videoDir, { recursive: true });
          const sceneFilename = `ep${episode.number}_scene${targetScene.orderIndex}_kling_${Date.now()}.mp4`;
          const sceneDest = path.join(videoDir, sceneFilename);
          await fs.copyFile(tempPath, sceneDest);
          const statScene = await fs.stat(sceneDest);

          await prisma.sceneAsset.create({
            data: {
              sceneId: targetScene.id,
              assetType: AnimationAssetType.RAW_VIDEO,
              localPath: `animation/videos/${sceneFilename}`,
              mimeType: "video/mp4",
              fileSize: statScene.size,
              approved: true,
              version: 2,
              metadata: {
                generatedBy: `Kling AI Video Cảnh ${targetScene.orderIndex} (10s)`,
                durationSec: Number(durationPerScene),
              },
            },
          });
        }

        await fs.unlink(tempPath).catch(() => {});

        return NextResponse.json({
          success: true,
          mode: "single",
          provider: "fal",
          message: `Đã tạo thành công video hoạt hình 3D (${durationPerScene}s) bằng Kling AI!`,
          render,
          prompt: singlePrompt,
        });
      }
    }

    // ==========================================
    // 2. GOOGLE VEO PROVIDER (FALLBACK)
    // ==========================================
    const apiKey = (body.apiKey as string)?.trim() || env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_API_KEY",
          error:
            "Chưa cấu hình GEMINI_API_KEY để gọi Video Generation API. Bạn có thể nhập API Key trực tiếp hoặc dán Master Prompt vào công cụ AI khác.",
          prompt: promptBundle.masterEpisodePrompt,
        },
        { status: 400 }
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelName = (body.model as string) || "veo-2.0-generate-001";

      let op = await ai.models.generateVideos({
        model: modelName,
        prompt: promptBundle.masterEpisodePrompt,
        config: {
          aspectRatio: "9:16",
          durationSeconds: 10,
        },
      });

      let attempts = 0;
      while (!op.done && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        op = await ai.operations.getVideosOperation({
          operation: op,
        });
        attempts++;
      }

      if (op.done && op.response?.generatedVideos?.[0]?.video) {
        const videoObj = op.response.generatedVideos[0].video;
        const tempPath = path.join(
          os.tmpdir(),
          `ai-episode-${id}-${Date.now()}.mp4`
        );

        await ai.files.download({
          file: videoObj,
          downloadPath: tempPath,
        });

        const render = await animationService.saveFullEpisodeUploadedVideo(
          id,
          tempPath,
          `ai-veo-episode-${episode.number}.mp4`
        );

        await fs.unlink(tempPath).catch(() => {});

        return NextResponse.json({
          success: true,
          provider: "google",
          message: "Đã tạo thành công video AI cho toàn bộ tập phim!",
          render,
          prompt: promptBundle.masterEpisodePrompt,
        });
      }

      return NextResponse.json({
        success: true,
        provider: "google",
        message: "Yêu cầu tạo video AI đã được gửi tới Google Video AI.",
        operation: op,
        prompt: promptBundle.masterEpisodePrompt,
      });
    } catch (genError: any) {
      const errorMsg =
        genError?.message ||
        "Lỗi không xác định khi gọi AI Video Generation API";

      let userFriendlyError = errorMsg;
      let errorCode = "PROVIDER_ERROR";

      if (errorMsg.includes("402") || errorMsg.includes("depleted")) {
        errorCode = "CREDITS_DEPLETED";
        userFriendlyError =
          "Tài khoản Google AI Studio đã hết credit trả trước (Lỗi 402: Prepayment credits are depleted). Bạn hãy nạp thêm credit trên https://ai.google.dev hoặc nhập API key mới.";
      } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        errorCode = "MODEL_ACCESS_DENIED";
        userFriendlyError =
          "Mô hình Video AI Veo chưa được kích hoạt trên API Key này (Yêu cầu tài khoản Vertex AI hoặc quyền truy cập Veo).";
      }

      return NextResponse.json(
        {
          success: false,
          code: errorCode,
          error: userFriendlyError,
          rawError: errorMsg,
          prompt: promptBundle.masterEpisodePrompt,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Thao tác tạo video AI thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

