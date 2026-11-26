import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import path from "path";
import { env } from "@/lib/env";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const relativePath = segments.join("/").replace(/^media\//, "");
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const baseDir = path.resolve(process.cwd(), env.MEDIA_ROOT);
    const fullPath = path.resolve(baseDir, normalized);

    if (!fullPath.startsWith(baseDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".aiff": "audio/aiff",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Handle Range requests for videos/audio
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(fullPath, { start, end });
      const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(fullPath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error streaming file";
    return new NextResponse(msg, { status: 500 });
  }
}
