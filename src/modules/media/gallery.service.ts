import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { cloudinaryService } from "@/providers/storage/cloudinary.service";

export type MediaCategory = "affiliate_mix" | "tiktok_dance" | "animation_drama" | "general";

export interface GalleryMediaItem {
  id: string;
  title: string;
  type: "image" | "video";
  category: MediaCategory;
  url: string;
  thumbnailUrl?: string;
  storageProvider: "CLOUDINARY" | "LOCAL";
  cloudinaryPublicId?: string;
  localPath?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

class GalleryService {
  private registryFile: string;

  constructor() {
    this.registryFile = path.join(process.cwd(), "media", "gallery_registry.json");
  }

  private async ensureRegistry(): Promise<GalleryMediaItem[]> {
    if (!existsSync(this.registryFile)) {
      const dir = path.dirname(this.registryFile);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Initialize with any existing TikTok dance videos or affiliate media
      const initialItems: GalleryMediaItem[] = [];

      // Check TikTok dance history
      const danceHistoryFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
      if (existsSync(danceHistoryFile)) {
        try {
          const raw = await fs.readFile(danceHistoryFile, "utf-8");
          const danceHistory = JSON.parse(raw);
          for (const item of danceHistory) {
            initialItems.push({
              id: item.id || crypto.randomUUID(),
              title: `TikTok Dance Video (${item.presetId || item.mode || "Video"})`,
              type: "video",
              category: "tiktok_dance",
              url: item.videoUrl,
              thumbnailUrl: item.characterImage,
              storageProvider: item.videoUrl?.startsWith("http") ? "CLOUDINARY" : "LOCAL",
              localPath: item.localPath,
              duration: item.duration || 10,
              createdAt: item.createdAt || new Date().toISOString(),
              metadata: {
                presetId: item.presetId,
                mode: item.mode,
                characterImage: item.characterImage,
              },
            });
          }
        } catch {
          // Ignore parse errors
        }
      }

      await fs.writeFile(this.registryFile, JSON.stringify(initialItems, null, 2));
      return initialItems;
    }

    try {
      const raw = await fs.readFile(this.registryFile, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async saveRegistry(items: GalleryMediaItem[]): Promise<void> {
    await fs.writeFile(this.registryFile, JSON.stringify(items, null, 2));
  }

  public async getItems(category?: string): Promise<GalleryMediaItem[]> {
    const items = await this.ensureRegistry();
    if (!category || category === "all") {
      return items;
    }
    return items.filter((item) => item.category === category);
  }

  public async addItem(item: Omit<GalleryMediaItem, "id" | "createdAt">): Promise<GalleryMediaItem> {
    const items = await this.ensureRegistry();
    const newItem: GalleryMediaItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    items.unshift(newItem);
    await this.saveRegistry(items);
    return newItem;
  }

  public async deleteItem(id: string): Promise<boolean> {
    const items = await this.ensureRegistry();
    const target = items.find((item) => item.id === id);
    if (!target) return false;

    // 1. Delete permanently from Cloudinary
    if (target.storageProvider === "CLOUDINARY" || target.url?.includes("cloudinary.com")) {
      const targetId = target.cloudinaryPublicId || target.url;
      await cloudinaryService.deleteResource(
        targetId,
        target.type === "video" ? "video" : "image"
      );
    }

    // 2. Delete local file if it exists and safe to remove
    if (target.localPath) {
      try {
        const fullLocalPath = path.isAbsolute(target.localPath)
          ? target.localPath
          : path.join(process.cwd(), "media", target.localPath.replace(/^\/?api\/media\/file\//, ""));
        if (existsSync(fullLocalPath)) {
          await fs.unlink(fullLocalPath);
        }
      } catch (err) {
        console.warn(`Lỗi khi xóa file local ${target.localPath}:`, err);
      }
    }

    // 3. If it was a TikTok dance video, also sync with tiktok-dance/history.json
    if (target.category === "tiktok_dance") {
      try {
        const historyFile = path.join(process.cwd(), "media", "tiktok-dance", "history.json");
        if (existsSync(historyFile)) {
          const raw = await fs.readFile(historyFile, "utf-8");
          let history = JSON.parse(raw);
          history = history.filter((h: any) => h.id !== id && h.videoUrl !== target.url);
          await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
        }
      } catch {
        // Ignore
      }
    }

    const filtered = items.filter((item) => item.id !== id);
    await this.saveRegistry(filtered);
    return true;
  }

  public async migrateLocalItemToCloud(id: string): Promise<GalleryMediaItem | null> {
    const isCloudinaryReady = await cloudinaryService.isConfigured();
    if (!isCloudinaryReady) {
      throw new Error("Chưa cấu hình tài khoản Cloudinary. Vui lòng cấu hình trước khi đồng bộ lên đám mây.");
    }

    const items = await this.ensureRegistry();
    const targetIndex = items.findIndex((item) => item.id === id);
    if (targetIndex === -1) return null;

    const item = items[targetIndex];
    if (item.storageProvider === "CLOUDINARY") return item;

    if (!item.localPath) {
      throw new Error("Không tìm thấy đường dẫn tệp trên máy để tải lên.");
    }

    const fullLocalPath = path.isAbsolute(item.localPath)
      ? item.localPath
      : path.join(process.cwd(), "media", item.localPath.replace(/^\/?api\/media\/file\//, ""));

    if (!existsSync(fullLocalPath)) {
      throw new Error("Tệp cục bộ không tồn tại trên ổ cứng.");
    }

    const buffer = await fs.readFile(fullLocalPath);
    const mimeType = item.type === "video" ? "video/mp4" : "image/png";

    const uploadRes = await cloudinaryService.uploadBuffer(
      buffer,
      mimeType,
      item.category,
      path.basename(fullLocalPath)
    );

    // Remove local file to free up Mac disk space
    try {
      await fs.unlink(fullLocalPath);
    } catch {
      // Ignore
    }

    const updatedItem: GalleryMediaItem = {
      ...item,
      url: uploadRes.secureUrl,
      storageProvider: "CLOUDINARY",
      cloudinaryPublicId: uploadRes.publicId,
      localPath: undefined,
      fileSize: uploadRes.bytes,
      width: uploadRes.width || item.width,
      height: uploadRes.height || item.height,
    };

    items[targetIndex] = updatedItem;
    await this.saveRegistry(items);
    return updatedItem;
  }
}

export const galleryService = new GalleryService();
