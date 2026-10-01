import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "@/lib/env";
import {
  SavedFileResult,
  StorageProvider,
} from "./storage-provider.interface";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
]);

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150MB

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.MEDIA_ROOT);
  }

  private sanitizeFileName(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueSuffix = crypto.randomBytes(6).toString("hex");
    return `${base}_${uniqueSuffix}${ext}`;
  }

  private resolveSafePath(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const safePath = path.resolve(this.baseDir, normalized);
    if (!safePath.startsWith(this.baseDir)) {
      throw new Error("Phát hiện lỗi bảo mật: Cố tình truy cập đường dẫn bất hợp pháp");
    }
    return safePath;
  }

  async saveFile(
    fileBuffer: Buffer,
    subFolder: string,
    originalName: string,
    mimeType: string
  ): Promise<SavedFileResult> {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Định dạng tệp không được hỗ trợ: ${mimeType}`);
    }

    const isVideo = mimeType.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileBuffer.length > maxSize) {
      throw new Error(
        `Dung lượng tệp vượt quá giới hạn tối đa (${Math.round(maxSize / (1024 * 1024))}MB)`
      );
    }

    const cleanName = this.sanitizeFileName(originalName);
    const targetDir = this.resolveSafePath(subFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const fullFilePath = path.join(targetDir, cleanName);
    await fs.writeFile(fullFilePath, fileBuffer);

    // Return path relative to project root (e.g. media/products/file.jpg)
    const relativeToRoot = path.relative(process.cwd(), fullFilePath);

    return {
      localPath: relativeToRoot,
      fileName: cleanName,
      fileSize: fileBuffer.length,
      mimeType,
    };
  }

  async getFileBuffer(localPath: string): Promise<Buffer> {
    const fullPath = path.resolve(process.cwd(), localPath);
    return await fs.readFile(fullPath);
  }

  async deleteFile(localPath: string): Promise<void> {
    try {
      const fullPath = path.resolve(process.cwd(), localPath);
      await fs.unlink(fullPath);
    } catch {
      // Ignore if already deleted
    }
  }

  async fileExists(localPath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(process.cwd(), localPath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const localStorageProvider = new LocalStorageProvider();
