import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
export const maxDuration = 300; // 5 mins

interface DancePreset {
  id: string;
  name: string;
  category: string;
  prompt: string;
  description: string;
}

export const DANCE_PRESETS: Record<string, DancePreset> = {
  hip_sway: {
    id: "hip_sway",
    name: "Lắc Hông Quyến Rũ (K-Pop Beat)",
    category: "Dance Trend",
    description: "Nhún nhảy uyển chuyển, lắc hông nhẹ nhàng sang hai bên theo nhịp nhạc, mỉm cười ngọt ngào nhìn camera.",
    prompt:
      "A stunning young Asian woman with long wavy dark hair wearing a black off-shoulder dress performing a smooth, mesmerizing TikTok dance in a luxury modern bedroom. She sways her hips gracefully from side to side to the rhythm, gentle body waves, moving her arms softly, making playful eye contact with a captivating charming smile. Photorealistic human motion, soft cinematic bedroom lighting, 4k 60fps, clean frame.",
  },
  boutique_spin: {
    id: "boutique_spin",
    name: "Xoay Người Tạo Dáng Thời Trang (Shop Boutique)",
    category: "Fashion / Try-on",
    description: "Xoay nhẹ 360 độ khoe trọn vóc dáng và đầm bodycon, vuốt nhẹ lọn tóc, bước lại gần camera tự tin.",
    prompt:
      "A gorgeous Asian fashion influencer posing for a luxury fashion TikTok haul in an elegant suite. She gracefully twirls around 360 degrees to showcase her black off-shoulder mini dress, delicately touches her hair, and steps closer to the camera with a confident radiant smile. Natural dress fabric physics, ultra-realistic body proportions, high definition 4k, vertical 9:16 portrait.",
  },
  cute_bounce: {
    id: "cute_bounce",
    name: "Nhún Nhảy Vũ Đạo Tay Dễ Thương (Cute Choreography)",
    category: "Viral Cute",
    description: "Nhún chân nhịp nhàng, làm động tác tay nhí nhảnh bắt trend (bắn tim, chỉ tay), biểu cảm vui tươi hút view.",
    prompt:
      "A charming beautiful Asian girl doing a viral cute TikTok dance routine in a stylish room. Rhythmic gentle bouncing, playful hand choreography with heart gestures, cheerful radiant facial expressions, sparkling eyes looking at the viewer. Fluid natural movements, sharp focus, cinema quality, 4k.",
  },
  catwalk_strut: {
    id: "catwalk_strut",
    name: "Dáng Đi Catwalk Kiêu Sa & Hất Tóc",
    category: "Glamour",
    description: "Bước đi chậm rãi kiêu kỳ về phía camera, hất nhẹ mái tóc bồng bềnh, dừng lại tạo dáng sang chảnh.",
    prompt:
      "A glamorous Asian model walking slowly towards the camera in a modern penthouse, elegant catwalk strut, subtle hip sway, flipping her wavy dark hair over her shoulder, stopping and posing with a seductive smile. Cinematic luxury atmosphere, pristine human movement, 4k 60fps.",
  },
};

const STRICT_NEGATIVE_PROMPT =
  "text, watermark, logo, subtitles, captions, username, handle, tiktok id, copyright, font, words, letters, brand name, overlays, split screen, low quality, deformed hands, broken fingers, extra limbs, bad anatomy, blur, cartoon, 3d render, doll, static photo";

async function uploadToFalCdn(filePathOrRel: string, falKey: string): Promise<string> {
  let fileBuf: Buffer;
  let filename: string;
  let contentType = "image/jpeg";

  if (filePathOrRel.startsWith("http://") || filePathOrRel.startsWith("https://")) {
    const res = await fetch(filePathOrRel);
    if (!res.ok) throw new Error(`Không thể tải tệp từ URL: ${filePathOrRel}`);
    fileBuf = Buffer.from(await res.arrayBuffer());
    filename = path.basename(new URL(filePathOrRel).pathname) || `file_${Date.now()}.png`;
    contentType = res.headers.get("content-type") || "image/png";
  } else {
    const fullPath = path.isAbsolute(filePathOrRel)
      ? filePathOrRel
      : path.join(process.cwd(), "media", filePathOrRel.replace(/^\/?api\/media\/file\//, ""));
    if (!existsSync(fullPath)) {
      throw new Error(`Không tìm thấy file tại ${fullPath}`);
    }

    fileBuf = await fs.readFile(fullPath);
    filename = path.basename(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    contentType = ext === ".png" ? "image/png" : ext === ".mp4" ? "video/mp4" : "image/jpeg";
  }

  const initRes = await fetch("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: filename,
      content_type: contentType,
    }),
  });

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    const detail = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData);
    if (detail.includes("Exhausted balance") || detail.includes("User is locked")) {
      throw new Error(
        "Tài khoản Fal.ai của bạn đã hết số dư (Exhausted balance). Vui lòng nạp thêm tiền tại https://fal.ai/dashboard/billing hoặc đổi FAL_KEY mới."
      );
    }
    throw new Error(`Upload Fal CDN thất bại: ${detail}`);
  }

  const initData = await initRes.json();
  const putRes = await fetch(initData.upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuf,
  });

  if (!putRes.ok) {
    throw new Error("PUT file lên Fal CDN thất bại.");
  }

  return initData.file_url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      characterImageRelPath = "tiktok-dance/characters/default_model.png",
      mode = "preset", // "preset" | "reference_video"
      presetId = "hip_sway",
      customPrompt = "",
      referenceVideoRelPath = "",
      audioRelPath = "",
      duration = "10", // "5" | "10" | "15" | "20" | "auto"
    } = body;

    const falKey = ((body.falKey as string)?.trim() || env.FAL_KEY)?.trim();
    if (!falKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình FAL_KEY. Vui lòng cấu hình FAL_KEY trong file .env.local hoặc nhập trực tiếp trên giao diện.",
        },
        { status: 400 }
      );
    }

    console.log(`[TikTok Dance] Bắt đầu tạo video: mode=${mode}, preset=${presetId}, duration=${duration}`);

    // 1. Upload character image to Fal CDN
    const characterCdnUrl = await uploadToFalCdn(characterImageRelPath, falKey);

    let falModel = "fal-ai/kling-video/v1/standard/image-to-video";
    let payload: Record<string, any> = {
      image_url: characterCdnUrl,
      duration: duration === "5" ? "5" : "10",
      aspect_ratio: "9:16",
      negative_prompt: STRICT_NEGATIVE_PROMPT,
    };

    let referenceAudioSourcePath: string | null = null;

    if (mode === "reference_video" && referenceVideoRelPath) {
      // User uploaded a reference TikTok video to copy motion from!
      const fullRefPath = path.join(
        process.cwd(),
        "media",
        referenceVideoRelPath.replace(/^\/?api\/media\/file\//, "")
      );

      let videoToProcessPath = fullRefPath;

      // Handle trimming if user selected a specific duration shorter than the reference video (e.g. 10s, 15s, 20s)
      if (duration && duration !== "auto" && duration !== "full") {
        const targetSec = parseInt(duration, 10);
        if (!isNaN(targetSec) && targetSec > 0) {
          const trimmedFilename = `trimmed_${Date.now()}_${path.basename(fullRefPath)}`;
          const trimmedDir = path.join(process.cwd(), "media", "tiktok-dance", "references");
          await fs.mkdir(trimmedDir, { recursive: true });
          const trimmedPath = path.join(trimmedDir, trimmedFilename);

          console.log(`[TikTok Dance] Pre-trimming video mẫu về ${targetSec}s bằng FFmpeg: ${trimmedPath}`);
          try {
            await execFileAsync(
              env.FFMPEG_PATH,
              ["-y", "-ss", "0", "-i", fullRefPath, "-t", String(targetSec), "-c", "copy", trimmedPath],
              { maxBuffer: 10 * 1024 * 1024 }
            );
            videoToProcessPath = trimmedPath;
          } catch (trimErr: any) {
            console.warn("[TikTok Dance] Lỗi pre-trim video, dùng file gốc:", trimErr.message);
          }
        }
      }

      referenceAudioSourcePath = videoToProcessPath;

      console.log(`[TikTok Dance] Upload reference video to Fal CDN: ${videoToProcessPath}`);
      const referenceVideoCdnUrl = await uploadToFalCdn(videoToProcessPath, falKey);

      // Kling Motion Control supports reference videos up to 30s
      falModel = "fal-ai/kling-video/v3/standard/motion-control";
      payload = {
        image_url: characterCdnUrl,
        video_url: referenceVideoCdnUrl,
        character_orientation: "video",
        keep_original_sound: true,
        negative_prompt: STRICT_NEGATIVE_PROMPT,
      };
    } else {
      // Preset mode or custom prompt
      const selectedPreset = DANCE_PRESETS[presetId];
      const finalPrompt = customPrompt.trim()
        ? customPrompt.trim()
        : selectedPreset?.prompt || DANCE_PRESETS.hip_sway.prompt;

      payload.prompt = finalPrompt;
    }

    // 2. Submit job to Fal.ai Queue
    console.log(`[TikTok Dance] Submitting to ${falModel}...`);
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
      const detail = typeof errJson.detail === "string" ? errJson.detail : submitRes.statusText;
      if (detail.includes("Exhausted balance") || detail.includes("User is locked")) {
        throw new Error(
          "Tài khoản Fal.ai của bạn đã hết số dư (Exhausted balance). Vui lòng nạp thêm tiền tại https://fal.ai/dashboard/billing hoặc đổi FAL_KEY mới."
        );
      }
      throw new Error(`Fal API lỗi (${falModel}): ${detail}`);
    }

    const submitData = await submitRes.json();
    const requestId = submitData.request_id;
    const statusUrl =
      submitData.status_url || `https://queue.fal.run/${falModel}/requests/${requestId}/status`;
    const responseUrl =
      submitData.response_url || `https://queue.fal.run/${falModel}/requests/${requestId}`;

    console.log(`[TikTok Dance] Job đã gửi lên Fal Queue thành công: RequestId=${requestId}`);

    // Save job configuration to disk for asynchronous polling
    const jobsDir = path.join(process.cwd(), "media", "tiktok-dance", "jobs");
    await fs.mkdir(jobsDir, { recursive: true });

    const jobData = {
      jobId: requestId,
      falModel,
      statusUrl,
      responseUrl,
      characterImageRelPath,
      referenceAudioSourcePath,
      audioRelPath,
      mode,
      presetId,
      duration: duration === "auto" ? "auto" : parseInt(duration, 10) || 10,
      falKey,
      status: "IN_QUEUE",
      createdAt: Date.now(),
    };

    await fs.writeFile(
      path.join(jobsDir, `${requestId}.json`),
      JSON.stringify(jobData, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: "Đã gửi tác vụ tạo video thành công! Bắt đầu dựng hình ảnh...",
      job: {
        jobId: requestId,
        status: "IN_QUEUE",
        falModel,
        duration: jobData.duration,
      },
    });
  } catch (err: any) {
    console.error("Lỗi tạo video TikTok Dance:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Lỗi tạo video vũ đạo" },
      { status: 500 }
    );
  }
}
