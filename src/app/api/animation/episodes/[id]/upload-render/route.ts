import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";
import { animationService } from "@/modules/animation/animation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp video (.mp4, .webm)" },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (![".mp4", ".webm", ".mov"].includes(ext)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ tệp video định dạng MP4, WEBM hoặc MOV" },
        { status: 400 }
      );
    }

    // Save temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(
      tempDir,
      `upload_${crypto.randomBytes(8).toString("hex")}${ext}`
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFile, buffer);

    // Save as full episode render
    const render = await animationService.saveFullEpisodeUploadedVideo(
      id,
      tempFile,
      file.name
    );

    // Clean temp
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup error
    }

    return NextResponse.json({
      success: true,
      message: "Đã tải lên và lưu video hoàn chỉnh của tập phim thành công!",
      render,
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Không thể lưu video tập phim";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
