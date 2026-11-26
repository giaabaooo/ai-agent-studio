import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const queryFalKey = searchParams.get("falKey")?.trim();

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Thiếu jobId" }, { status: 400 });
    }

    const jobFilePath = path.join(process.cwd(), "media", "tiktok-dance", "jobs", `${jobId}.json`);

    // If job file doesn't exist, check history
    if (!existsSync(jobFilePath)) {
      const historyFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
      if (existsSync(historyFile)) {
        try {
          const raw = await fs.readFile(historyFile, "utf-8");
          const history = JSON.parse(raw);
          const found = history.find((h: any) => h.jobId === jobId || h.id === jobId);
          if (found) {
            return NextResponse.json({ success: true, isCompleted: true, video: found });
          }
        } catch {}
      }
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên xử lý của video này." },
        { status: 404 }
      );
    }

    const jobRaw = await fs.readFile(jobFilePath, "utf-8");
    const job = JSON.parse(jobRaw);
    const falKey = queryFalKey || job.falKey || env.FAL_KEY;

    if (!falKey) {
      return NextResponse.json(
        { success: false, error: "Chưa cấu hình FAL_KEY để kiểm tra tiến trình." },
        { status: 400 }
      );
    }

    // 1. Check status on Fal.ai
    const checkRes = await fetch(job.statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!checkRes.ok) {
      const errJson = await checkRes.json().catch(() => ({}));
      const detail = typeof errJson.detail === "string" ? errJson.detail : checkRes.statusText;
      return NextResponse.json(
        { success: false, error: `Kiểm tra Fal API thất bại: ${detail}` },
        { status: 500 }
      );
    }

    const statusData = await checkRes.json();
    console.log(`[TikTok Dance Status] Job ${jobId}: status=${statusData.status}`);

    // If still running
    if (statusData.status === "IN_QUEUE" || statusData.status === "IN_PROGRESS") {
      return NextResponse.json({
        success: true,
        isCompleted: false,
        status: statusData.status,
        queuePosition: statusData.queue_position ?? null,
      });
    }

    // If failed
    if (statusData.status === "FAILED") {
      await fs.unlink(jobFilePath).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          isCompleted: true,
          error: statusData.error || "Quá trình tạo video thất bại trên cụm máy chủ AI.",
        },
        { status: 500 }
      );
    }

    // If completed -> fetch result
    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(job.responseUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });

      if (!resultRes.ok) {
        throw new Error("Không thể tải thông tin video thành phẩm từ Fal API.");
      }

      const resData = await resultRes.json();
      if (!resData?.video?.url) {
        throw new Error("Fal API không trả về đường dẫn video hợp lệ.");
      }

      // Download output video
      const timestamp = Date.now();
      const outputDir = path.join(process.cwd(), "media", "tiktok-dance", "outputs");
      await fs.mkdir(outputDir, { recursive: true });

      const rawVideoFilename = `dance_raw_${timestamp}.mp4`;
      const rawVideoPath = path.join(outputDir, rawVideoFilename);

      console.log(`[TikTok Dance] Tải video kết quả: ${resData.video.url}`);
      const downloadRes = await fetch(resData.video.url);
      if (!downloadRes.ok) throw new Error("Tải tệp video từ Fal CDN thất bại.");
      const videoBuffer = await downloadRes.arrayBuffer();
      await fs.writeFile(rawVideoPath, Buffer.from(videoBuffer));

      let finalRelativePath = `tiktok-dance/outputs/${rawVideoFilename}`;

      // Audio handling: mux original sound or custom sound
      let audioToMux: string | null = null;
      if (job.audioRelPath) {
        const fullCustomAudioPath = path.join(
          process.cwd(),
          "media",
          job.audioRelPath.replace(/^\/?api\/media\/file\//, "")
        );
        if (existsSync(fullCustomAudioPath)) {
          audioToMux = fullCustomAudioPath;
        }
      } else if (job.referenceAudioSourcePath && existsSync(job.referenceAudioSourcePath)) {
        audioToMux = job.referenceAudioSourcePath;
      }

      if (audioToMux) {
        const muxedFilename = `dance_final_${timestamp}.mp4`;
        const muxedPath = path.join(outputDir, muxedFilename);

        try {
          console.log(`[TikTok Dance] Ghép âm thanh từ ${audioToMux} vào video...`);
          await execFileAsync(
            env.FFMPEG_PATH,
            [
              "-y",
              "-i",
              rawVideoPath,
              "-i",
              audioToMux,
              "-map",
              "0:v:0",
              "-map",
              "1:a:0?",
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-shortest",
              muxedPath,
            ],
            { maxBuffer: 10 * 1024 * 1024 }
          );

          if (existsSync(muxedPath)) {
            finalRelativePath = `tiktok-dance/outputs/${muxedFilename}`;
            console.log(`[TikTok Dance] Đã ghép nhạc thành công: ${finalRelativePath}`);
          }
        } catch (muxErr: any) {
          console.warn("Lỗi ghép nhạc FFmpeg, giữ bản video gốc:", muxErr.message);
        }
      }

      // Save to history JSON
      const historyFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
      let history: any[] = [];
      try {
        if (existsSync(historyFile)) {
          const raw = await fs.readFile(historyFile, "utf-8");
          history = JSON.parse(raw);
        }
      } catch {
        history = [];
      }

      let finalVideoUrl = `/api/media/file/${finalRelativePath}`;
      let storageProvider: "CLOUDINARY" | "LOCAL" = "LOCAL";
      let cloudinaryPublicId: string | undefined;

      // Check if Cloudinary is configured to save disk space
      try {
        const { cloudinaryService } = await import("@/providers/storage/cloudinary.service");
        const { galleryService } = await import("@/modules/media/gallery.service");
        const isCloudReady = await cloudinaryService.isConfigured();

        if (isCloudReady) {
          const fullFinalVideoPath = path.join(
            process.cwd(),
            "media",
            finalRelativePath.replace(/^\/?api\/media\/file\//, "")
          );
          if (existsSync(fullFinalVideoPath)) {
            const videoBuffer = await fs.readFile(fullFinalVideoPath);
            const uploadRes = await cloudinaryService.uploadBuffer(
              videoBuffer,
              "video/mp4",
              "tiktok_dance",
              `dance_${timestamp}.mp4`
            );
            finalVideoUrl = uploadRes.secureUrl;
            storageProvider = "CLOUDINARY";
            cloudinaryPublicId = uploadRes.publicId;

            // Delete heavy local video to prevent Mac disk saturation
            await fs.unlink(fullFinalVideoPath).catch(() => {});
          }
        }

        // Register in unified Media Vault Gallery
        await galleryService.addItem({
          title: `TikTok Dance Video (${job.presetId || job.mode || "Hot Trend"})`,
          type: "video",
          category: "tiktok_dance",
          url: finalVideoUrl,
          thumbnailUrl: `/api/media/file/${job.characterImageRelPath.replace(/^\/?api\/media\/file\//, "")}`,
          storageProvider,
          cloudinaryPublicId,
          localPath: storageProvider === "LOCAL" ? finalRelativePath : undefined,
          duration: typeof job.duration === "number" ? job.duration : 10,
          metadata: {
            jobId,
            mode: job.mode,
            presetId: job.presetId,
          },
        });
      } catch (cloudErr) {
        console.warn("Lỗi lưu video lên Cloudinary/Gallery:", cloudErr);
      }

      const newRecord = {
        id: `dance_${timestamp}`,
        jobId,
        videoUrl: finalVideoUrl,
        localPath: finalRelativePath,
        storageProvider,
        characterImage: `/api/media/file/${job.characterImageRelPath.replace(/^\/?api\/media\/file\//, "")}`,
        mode: job.mode,
        presetId: job.presetId,
        duration: job.duration,
        createdAt: new Date().toISOString(),
      };

      history.unshift(newRecord);
      await fs.writeFile(historyFile, JSON.stringify(history.slice(0, 50), null, 2));

      // Remove job file on completion
      await fs.unlink(jobFilePath).catch(() => {});

      return NextResponse.json({
        success: true,
        isCompleted: true,
        message: "Tạo video nhảy TikTok thành công!",
        video: newRecord,
      });
    }

    return NextResponse.json({
      success: true,
      isCompleted: false,
      status: statusData.status,
    });
  } catch (err: any) {
    console.error("Lỗi kiểm tra trạng thái TikTok Dance:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Lỗi kiểm tra trạng thái" },
      { status: 500 }
    );
  }
}
