import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AnimationAssetType } from "@prisma/client";
import { animationService } from "@/modules/animation/animation.service";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const maxDuration = 300; // 5 minutes for AI audio generation

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { sceneId } = body;

    const falKey = env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { success: false, error: "Chưa cấu hình FAL_KEY trong hệ thống." },
        { status: 500 }
      );
    }

    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: {
              orderBy: { version: "desc" },
            },
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tập phim" },
        { status: 404 }
      );
    }

    const scenesToProcess = sceneId
      ? episode.scenes.filter((s) => s.id === sceneId)
      : episode.scenes;

    if (scenesToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phân cảnh cần tạo âm thanh." },
        { status: 400 }
      );
    }

    const results = [];
    const videosDir = path.join(process.cwd(), "media", "animation", "videos");
    const audioDir = path.join(process.cwd(), "media", "animation", "audio");
    await fs.mkdir(videosDir, { recursive: true });
    await fs.mkdir(audioDir, { recursive: true });

    for (const scene of scenesToProcess) {
      // Find latest approved or latest RAW_VIDEO asset
      const videoAsset =
        scene.assets.find(
          (a) => a.assetType === AnimationAssetType.RAW_VIDEO && a.approved
        ) ||
        scene.assets.find((a) => a.assetType === AnimationAssetType.RAW_VIDEO);

      if (!videoAsset || !videoAsset.localPath) {
        console.warn(`Scene #${scene.orderIndex} chưa có video raw, bỏ qua.`);
        continue;
      }

      if (!sceneId && (videoAsset.metadata as any)?.hasAudio) {
        console.log(`Scene #${scene.orderIndex} đã có âm thanh Kling, bỏ qua.`);
        continue;
      }

      const inputVideoPath = path.join(process.cwd(), "media", videoAsset.localPath);
      if (!existsSync(inputVideoPath)) {
        console.warn(`Không tìm thấy file video tại: ${inputVideoPath}`);
        continue;
      }

      console.log(`[Kling Audio] Đang xử lý Cảnh #${scene.orderIndex}: ${inputVideoPath}`);
      const videoBuffer = await fs.readFile(inputVideoPath);

      // 1. Upload video to Fal storage
      const initRes = await fetch(
        "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_name: `ep${episode.number}_scene${scene.orderIndex}_input.mp4`,
            content_type: "video/mp4",
          }),
        }
      );

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(`Upload video Cảnh #${scene.orderIndex} thất bại: ${JSON.stringify(errData)}`);
      }

      const initData = await initRes.json();
      const uploadRes = await fetch(initData.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoBuffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`PUT video Cảnh #${scene.orderIndex} vào Fal CDN thất bại.`);
      }

      const uploadedVideoUrl = initData.file_url;

      // 2. Submit to fal-ai/kling-video/video-to-audio
      const promptHint = `3D Pixar animation sound effects, ${scene.title || ""}, playful ambient sounds, lively foley, high quality sound design`;
      const submitRes = await fetch("https://queue.fal.run/fal-ai/kling-video/video-to-audio", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: uploadedVideoUrl,
          sound_effect_prompt: promptHint,
        }),
      });

      if (!submitRes.ok) {
        const submitErr = await submitRes.json().catch(() => ({}));
        throw new Error(`Kling Video-to-Audio Cảnh #${scene.orderIndex} lỗi: ${JSON.stringify(submitErr)}`);
      }

      const submitData = await submitRes.json();
      const statusUrl =
        submitData.status_url ||
        `https://queue.fal.run/fal-ai/kling-video/requests/${submitData.request_id}/status`;
      const responseUrl =
        submitData.response_url ||
        `https://queue.fal.run/fal-ai/kling-video/requests/${submitData.request_id}`;

      // 3. Poll for completion (up to 180 seconds)
      let isCompleted = false;
      let finalData: any = null;
      let attempts = 0;

      while (attempts < 45) {
        await new Promise((r) => setTimeout(r, 4000));
        attempts++;

        const checkRes = await fetch(statusUrl, {
          headers: { Authorization: `Key ${falKey}` },
        });

        if (checkRes.ok) {
          const statusData = await checkRes.json();
          if (statusData.status === "COMPLETED") {
            const resRes = await fetch(responseUrl, {
              headers: { Authorization: `Key ${falKey}` },
            });
            if (resRes.ok) {
              finalData = await resRes.json();
              isCompleted = true;
            }
            break;
          } else if (statusData.status === "FAILED") {
            throw new Error(`Kling Audio Cảnh #${scene.orderIndex} thất bại: ${statusData.error || "Lỗi xử lý"}`);
          }
        }
      }

      if (!isCompleted || !finalData?.video?.url) {
        throw new Error(`Kling Audio Cảnh #${scene.orderIndex} timeout hoặc không có kết quả.`);
      }

      // 4. Download generated video (which contains synchronized audio)
      const timestamp = Date.now();
      const outputVideoFilename = `ep${episode.number}_scene${scene.orderIndex}_kling_sfx_${timestamp}.mp4`;
      const localVideoRelativePath = `animation/videos/${outputVideoFilename}`;
      const localVideoAbsolutePath = path.join(process.cwd(), "media", localVideoRelativePath);

      const downloadVideoRes = await fetch(finalData.video.url);
      if (!downloadVideoRes.ok) {
        throw new Error(`Tải video kết quả Cảnh #${scene.orderIndex} thất bại`);
      }
      const videoArrayBuffer = await downloadVideoRes.arrayBuffer();
      await fs.writeFile(localVideoAbsolutePath, Buffer.from(videoArrayBuffer));

      // Also save the separate audio file if available
      let localAudioRelativePath: string | undefined;
      if (finalData.audio?.url) {
        const outputAudioFilename = `ep${episode.number}_scene${scene.orderIndex}_kling_sfx_${timestamp}.mp3`;
        localAudioRelativePath = `animation/audio/${outputAudioFilename}`;
        const localAudioAbsolutePath = path.join(process.cwd(), "media", localAudioRelativePath);
        const downloadAudioRes = await fetch(finalData.audio.url);
        if (downloadAudioRes.ok) {
          const audioArrayBuffer = await downloadAudioRes.arrayBuffer();
          await fs.writeFile(localAudioAbsolutePath, Buffer.from(audioArrayBuffer));
        }
      }

      // 5. Unapprove old video assets for this scene
      await prisma.sceneAsset.updateMany({
        where: {
          sceneId: scene.id,
          assetType: AnimationAssetType.RAW_VIDEO,
        },
        data: { approved: false },
      });

      // 6. Create new approved SceneAsset
      const maxVersion = Math.max(0, ...scene.assets.map((a) => a.version));
      const newAsset = await prisma.sceneAsset.create({
        data: {
          sceneId: scene.id,
          assetType: AnimationAssetType.RAW_VIDEO,
          localPath: localVideoRelativePath,
          version: maxVersion + 1,
          approved: true,
          mimeType: "video/mp4",
          fileSize: videoArrayBuffer.byteLength,
          metadata: {
            generatedBy: "Kling AI Video-to-Audio",
            hasAudio: true,
            audioPath: localAudioRelativePath,
            sourceVideoUrl: finalData.video.url,
            sourceAudioUrl: finalData.audio?.url,
          },
        },
      });

      results.push({
        sceneId: scene.id,
        orderIndex: scene.orderIndex,
        assetId: newAsset.id,
        localPath: localVideoRelativePath,
      });
    }

    // 7. Auto render the full episode with the new video clips + audio
    let renderResult = null;
    try {
      renderResult = await animationService.renderEpisode(episodeId);
    } catch (renderErr: any) {
      console.warn("Auto-render failed after Kling Audio:", renderErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Đã sinh âm thanh hoạt ảnh Kling thành công cho ${results.length} cảnh và xuất phim mới!`,
      results,
      render: renderResult,
    });
  } catch (err: any) {
    console.error("Lỗi Kling Video-to-Audio:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Lỗi tạo âm thanh hoạt ảnh Kling" },
      { status: 500 }
    );
  }
}
