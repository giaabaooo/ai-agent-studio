import { NextRequest, NextResponse } from "next/server";
import { cloudinaryService } from "@/providers/storage/cloudinary.service";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "character"; // "character" | "reference_video" | "audio"

    if (!file) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tệp tải lên" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let targetSubdir = "characters";
    if (type === "reference_video") targetSubdir = "references";
    if (type === "audio") targetSubdir = "audio";

    // Auto upload to Cloudinary (folder: tiktok-video/uploads/...)
    let finalUrl = "";
    let cloudinaryPublicId = "";
    const isCloudReady = await cloudinaryService.isConfigured();

    if (isCloudReady) {
      const mimeType = file.type || (type === "character" ? "image/png" : type === "audio" ? "audio/mpeg" : "video/mp4");
      const uploadRes = await cloudinaryService.uploadBuffer(buffer, mimeType, `uploads/${targetSubdir}`, file.name);
      finalUrl = uploadRes.secureUrl;
      cloudinaryPublicId = uploadRes.publicId;
    }

    // Save temporary local copy for ffmpeg/audio processing only if audio or reference video
    let relativePath = "";
    if (type !== "character") {
      const uploadDir = path.join(process.cwd(), "media", "tiktok-dance", targetSubdir);
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(file.name) || (type === "audio" ? ".mp3" : ".mp4");
      const filename = `${type}_${Date.now()}${ext}`;
      relativePath = `tiktok-dance/${targetSubdir}/${filename}`;
      const fullPath = path.join(uploadDir, filename);
      await fs.writeFile(fullPath, buffer);
      if (!finalUrl) {
        finalUrl = `/api/media/file/${relativePath}`;
      }
    } else if (!finalUrl) {
      const uploadDir = path.join(process.cwd(), "media", "tiktok-dance", targetSubdir);
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(file.name) || ".png";
      const filename = `${type}_${Date.now()}${ext}`;
      relativePath = `tiktok-dance/${targetSubdir}/${filename}`;
      const fullPath = path.join(uploadDir, filename);
      await fs.writeFile(fullPath, buffer);
      finalUrl = `/api/media/file/${relativePath}`;
    }

    return NextResponse.json({
      success: true,
      url: finalUrl,
      localPath: relativePath || finalUrl,
      cloudinaryPublicId,
      filename: file.name,
      size: buffer.byteLength,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Tải lên thất bại" }, { status: 500 });
  }
}
