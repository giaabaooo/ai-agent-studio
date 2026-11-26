import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET() {
  try {
    const historyFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
    if (!existsSync(historyFile)) {
      return NextResponse.json({ success: true, history: [] });
    }

    const raw = await fs.readFile(historyFile, "utf-8");
    const history = JSON.parse(raw);
    return NextResponse.json({ success: true, history });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });

    const historyFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
    if (!existsSync(historyFile)) {
      return NextResponse.json({ success: true });
    }

    const raw = await fs.readFile(historyFile, "utf-8");
    let history = JSON.parse(raw);
    const targetItem = history.find((item: any) => item.id === id);

    if (targetItem) {
      // 1. Delete from Cloudinary if stored or if URL is Cloudinary
      if (targetItem.videoUrl?.includes("cloudinary.com") || targetItem.storageProvider === "CLOUDINARY") {
        try {
          const { cloudinaryService } = await import("@/providers/storage/cloudinary.service");
          await cloudinaryService.deleteResource(targetItem.videoUrl, "video");
        } catch (cErr) {
          console.warn("Lỗi xóa video trên Cloudinary:", cErr);
        }
      }

      // 2. Delete local video file if it exists
      if (targetItem.localPath) {
        try {
          const fullPath = path.isAbsolute(targetItem.localPath)
            ? targetItem.localPath
            : path.join(process.cwd(), "media", targetItem.localPath.replace(/^\/?api\/media\/file\//, ""));
          if (existsSync(fullPath)) {
            await fs.unlink(fullPath);
          }
        } catch (fErr) {
          console.warn("Lỗi xóa file cục bộ:", fErr);
        }
      }

      // 3. Sync delete with Gallery Service
      try {
        const { galleryService } = await import("@/modules/media/gallery.service");
        await galleryService.deleteItem(id);
      } catch {
        // Ignore
      }
    }

    history = history.filter((item: any) => item.id !== id);
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

    return NextResponse.json({ success: true, message: "Đã xóa video thành công khỏi Cloudinary và hệ thống" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
