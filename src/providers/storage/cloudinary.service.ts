import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  bytes: number;
  format: string;
  width?: number;
  height?: number;
  resourceType: "image" | "video" | "raw";
}

class CloudinaryService {
  private configFilePath: string;
  private runtimeConfig: CloudinaryConfig | null = null;
  private isInitialized = false;

  constructor() {
    this.configFilePath = path.join(process.cwd(), "media", "cloudinary_config.json");
    this.ensureInitialized();
  }

  private ensureInitialized() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dcadn2syh";
    const apiKey = process.env.CLOUDINARY_API_KEY || "178359369335534";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "FwsPdInccg7HPp6iLNn9ewxDJe4";

    if (cloudName && apiKey && apiSecret) {
      this.runtimeConfig = { cloudName, apiKey, apiSecret };
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isInitialized = true;
    }
  }

  private async loadConfig(): Promise<CloudinaryConfig> {
    if (this.runtimeConfig && this.isInitialized) return this.runtimeConfig;

    // 1. Check environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dcadn2syh";
    const apiKey = process.env.CLOUDINARY_API_KEY || "178359369335534";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "FwsPdInccg7HPp6iLNn9ewxDJe4";

    this.runtimeConfig = { cloudName, apiKey, apiSecret };
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.isInitialized = true;
    return this.runtimeConfig;
  }

  public async isConfigured(): Promise<boolean> {
    await this.loadConfig();
    return Boolean(
      this.runtimeConfig &&
        this.runtimeConfig.cloudName &&
        this.runtimeConfig.apiKey &&
        this.runtimeConfig.apiSecret
    );
  }

  public async getConfigInfo(): Promise<{
    cloudName: string;
    apiKey: string;
    hasSecret: boolean;
    isConfigured: boolean;
  }> {
    const config = await this.loadConfig();
    return {
      cloudName: config.cloudName,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 4)}***${config.apiKey.slice(-3)}` : "",
      hasSecret: Boolean(config.apiSecret),
      isConfigured: true,
    };
  }

  public async saveConfig(config: CloudinaryConfig): Promise<void> {
    const dir = path.dirname(this.configFilePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(
      this.configFilePath,
      JSON.stringify(
        {
          cloudName: config.cloudName.trim(),
          apiKey: config.apiKey.trim(),
          apiSecret: config.apiSecret.trim(),
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    this.runtimeConfig = {
      cloudName: config.cloudName.trim(),
      apiKey: config.apiKey.trim(),
      apiSecret: config.apiSecret.trim(),
    };
    cloudinary.config({
      cloud_name: this.runtimeConfig.cloudName,
      api_key: this.runtimeConfig.apiKey,
      api_secret: this.runtimeConfig.apiSecret,
      secure: true,
    });
    this.isInitialized = true;
  }

  /**
   * Resolve folder path respecting user request "folder tiktok-video"
   */
  private getTargetFolder(subFolder?: string): string {
    const baseFolder = process.env.CLOUDINARY_DEFAULT_FOLDER || "tiktok-video";
    if (!subFolder) return baseFolder;
    const cleanSub = subFolder.replace(/^\/+|\/+$/g, "");
    if (cleanSub.startsWith(baseFolder)) return cleanSub;
    return `${baseFolder}/${cleanSub}`;
  }

  public async uploadBase64(
    base64Data: string,
    mimeType: string,
    subFolder: string = "affiliate_studio"
  ): Promise<CloudinaryUploadResult> {
    await this.loadConfig();

    const dataUri = base64Data.startsWith("data:")
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;

    const folder = this.getTargetFolder(subFolder);
    const res = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: mimeType.startsWith("video/") ? "video" : "image",
    });

    return {
      url: res.url,
      secureUrl: res.secure_url,
      publicId: res.public_id,
      bytes: res.bytes,
      format: res.format,
      width: res.width,
      height: res.height,
      resourceType: res.resource_type as "image" | "video" | "raw",
    };
  }

  public async uploadBuffer(
    buffer: Buffer,
    mimeType: string,
    subFolder: string = "tiktok_dance",
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    await this.loadConfig();

    const folder = this.getTargetFolder(subFolder);
    const isVideo = mimeType.startsWith("video/");

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? "video" : "image",
          public_id: filename ? path.parse(filename).name : undefined,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error("Upload lên Cloudinary thất bại"));
          }
          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type as "image" | "video" | "raw",
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Extract Cloudinary publicId from a URL or return the string if already a publicId
   */
  public extractPublicId(urlOrId: string): string {
    if (!urlOrId.includes("cloudinary.com")) return urlOrId;
    try {
      // Example: https://res.cloudinary.com/dcadn2syh/video/upload/v1740228392/tiktok-video/outputs/dance_final.mp4
      const url = new URL(urlOrId);
      const parts = url.pathname.split("/");
      // Look for upload index
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex !== -1 && uploadIndex + 1 < parts.length) {
        let relevantParts = parts.slice(uploadIndex + 1);
        // If next part starts with 'v' followed by digits (version), skip it
        if (relevantParts[0].match(/^v\d+$/)) {
          relevantParts = relevantParts.slice(1);
        }
        const fullPath = relevantParts.join("/");
        // Remove file extension
        return fullPath.replace(/\.[^/.]+$/, "");
      }
    } catch {
      // Ignore
    }
    return urlOrId;
  }

  public async deleteResource(
    publicIdOrUrl: string,
    resourceType: "image" | "video" = "image"
  ): Promise<boolean> {
    try {
      await this.loadConfig();
      const publicId = this.extractPublicId(publicIdOrUrl);

      // Try specified resource type first
      let res = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (res.result === "ok") {
        console.log(`[Cloudinary] Đã xóa thành công ${resourceType}: ${publicId}`);
        return true;
      }

      // Fallback try the alternate type (e.g. video vs image)
      const alternateType = resourceType === "video" ? "image" : "video";
      res = await cloudinary.uploader.destroy(publicId, {
        resource_type: alternateType,
        invalidate: true,
      });

      if (res.result === "ok") {
        console.log(`[Cloudinary] Đã xóa thành công ${alternateType}: ${publicId}`);
        return true;
      }

      return false;
    } catch (err) {
      console.warn("Lỗi khi xóa tài nguyên trên Cloudinary:", err);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
