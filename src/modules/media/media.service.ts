import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { AssetType, CreativeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { macOsSayVoiceProvider } from "@/providers/voice/macos-say.provider";

const execFileAsync = promisify(execFile);

function mediaRoot() {
  return path.resolve(process.cwd(), env.MEDIA_ROOT);
}

function storageKey(inputPath: string) {
  const root = mediaRoot();
  const cleaned = inputPath.replace(/^(\.\/)?media[\\/]/, "");
  const absolutePath = path.isAbsolute(cleaned) ? cleaned : path.resolve(root, cleaned);
  const key = path.relative(root, absolutePath);
  if (!key || key.startsWith("..") || path.isAbsolute(key)) {
    throw new Error("Media path nằm ngoài MEDIA_ROOT");
  }
  return key.split(path.sep).join("/");
}

function srtTime(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000); const remainder = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(remainder).padStart(3, "0")}`;
}

async function fileInfo(absolutePath: string) {
  const stat = await fs.stat(absolutePath);
  const mimeType = absolutePath.endsWith(".mp4") ? "video/mp4" : absolutePath.endsWith(".wav") ? "audio/wav" : absolutePath.endsWith(".srt") ? "application/x-subrip" : "audio/aiff";
  return { fileSize: stat.size, mimeType };
}

export class MediaService {
  async createSubtitles(creativeId: string) {
    const creative = await prisma.creative.findUnique({ where: { id: creativeId }, include: { timelines: { orderBy: { orderIndex: "asc" } } } });
    if (!creative) throw new Error("Không tìm thấy creative");
    const contents = creative.timelines.map((item, index) => `${index + 1}\n${srtTime(item.startSec)} --> ${srtTime(item.endSec)}\n${item.overlayText || item.voiceText}\n`).join("\n");
    const directory = path.join(mediaRoot(), "subtitles"); await fs.mkdir(directory, { recursive: true });
    const outputPath = path.join(directory, `${creativeId}-${crypto.randomBytes(4).toString("hex")}.srt`);
    await fs.writeFile(outputPath, contents, "utf8");
    const info = await fileInfo(outputPath);
    return prisma.asset.create({ data: { creativeId, type: AssetType.SUBTITLE_SRT, localPath: storageKey(outputPath), ...info, metadata: { format: "srt", cues: creative.timelines.length }, storageProvider: "LOCAL", machineLabel: env.MACHINE_LABEL } });
  }
  async attachUpload(creativeId: string, type: AssetType, localPath: string, mimeType: string, fileSize: number) {
    const creative = await prisma.creative.findUnique({ where: { id: creativeId } });
    if (!creative) throw new Error("Không tìm thấy creative");
    const storageKeyValue = storageKey(localPath);
    const asset = await prisma.asset.create({ data: { creativeId, type, localPath: storageKeyValue, mimeType, fileSize, storageProvider: "LOCAL", machineLabel: env.MACHINE_LABEL } });
    const status = type === AssetType.RAW_VIDEO ? CreativeStatus.VIDEO_UPLOADED : type === AssetType.GENERATED_IMAGE ? CreativeStatus.IMAGE_UPLOADED : creative.status;
    if (status !== creative.status) await prisma.creative.update({ where: { id: creativeId }, data: { status } });
    return asset;
  }

  async generateVoice(creativeId: string) {
    if (env.VOICE_PROVIDER === "EXTERNAL" || process.platform !== "darwin") {
      throw new Error("Máy này dùng voice ngoài. Hãy tạo WAV/MP3 rồi upload vào bước Voice thay vì sinh tự động.");
    }
    const creative = await prisma.creative.findUnique({ where: { id: creativeId }, include: { timelines: { orderBy: { orderIndex: "asc" } }, creator: { include: { voiceProfiles: { where: { isDefault: true }, take: 1 } } } } });
    if (!creative) throw new Error("Không tìm thấy creative");
    const text = creative.timelines.map((item) => item.voiceText).join(" ").trim();
    if (!text) throw new Error("Kịch bản chưa có lời thoại");
    const profile = creative.creator.voiceProfiles[0];
    const voice = await macOsSayVoiceProvider.generateSpeech(text, `${creative.id}-voice`, { voiceName: profile?.providerVoiceId, speakingRate: profile?.speakingRate });
    const absolutePath = path.join(mediaRoot(), voice.localPath);
    const info = await fileInfo(absolutePath);
    const asset = await prisma.asset.create({ data: { creativeId, type: AssetType.VOICE_AUDIO, localPath: storageKey(absolutePath), ...info, metadata: { durationSec: voice.durationSec }, storageProvider: "LOCAL", machineLabel: env.MACHINE_LABEL } });
    await prisma.creative.update({ where: { id: creativeId }, data: { status: CreativeStatus.VOICE_GENERATED } });
    return asset;
  }

  async confirmRawAsFinal(creativeId: string) {
    const creative = await prisma.creative.findUnique({ where: { id: creativeId }, include: { assets: { orderBy: { createdAt: "desc" } } } });
    if (!creative) throw new Error("Không tìm thấy creative");
    const raw = creative.assets.find((asset) => asset.type === AssetType.RAW_VIDEO);
    if (!raw) throw new Error("Cần upload video raw trước khi xác nhận");

    await prisma.asset.deleteMany({
      where: { creativeId, type: AssetType.FINAL_VIDEO },
    });

    const asset = await prisma.asset.create({
      data: {
        creativeId,
        type: AssetType.FINAL_VIDEO,
        localPath: raw.localPath,
        mimeType: raw.mimeType,
        fileSize: raw.fileSize,
        metadata: { canvas: "native", source: "RAW_CONFIRMED", nativeAudioKept: true, voiceReplacement: false, subtitlesBurned: false },
        storageProvider: raw.storageProvider,
        machineLabel: env.MACHINE_LABEL,
      },
    });
    await prisma.creative.update({ where: { id: creativeId }, data: { status: CreativeStatus.FINAL_RENDERED } });
    return asset;
  }

  async renderFinal(
    creativeId: string,
    options: { replaceNativeAudio?: boolean; burnSubtitles?: boolean } = {}
  ) {
    const creative = await prisma.creative.findUnique({ where: { id: creativeId }, include: { assets: { orderBy: { createdAt: "desc" } } } });
    if (!creative) throw new Error("Không tìm thấy creative");
    const raw = creative.assets.find((asset) => asset.type === AssetType.RAW_VIDEO);
    const voice = options.replaceNativeAudio
      ? creative.assets.find((asset) => asset.type === AssetType.VOICE_AUDIO)
      : undefined;
    if (!raw) throw new Error("Cần upload video raw trước khi render");
    const rawPath = path.join(mediaRoot(), raw.localPath);
    const voicePath = voice ? path.join(mediaRoot(), voice.localPath) : undefined;
    await fs.access(rawPath);
    let subtitlePath: string | undefined;
    if (options.burnSubtitles) {
      const subtitle = await this.createSubtitles(creativeId);
      subtitlePath = path.join(mediaRoot(), subtitle.localPath);
    }
    const outputDir = path.join(mediaRoot(), "finals");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${creative.id}-${crypto.randomBytes(4).toString("hex")}.mp4`);
    const args = ["-y", "-i", rawPath];
    if (voicePath) args.push("-i", voicePath, "-map", "0:v:0", "-map", "1:a:0", "-shortest");
    let videoFilter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1";
    if (subtitlePath) {
      const escapedSubtitlePath = subtitlePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
      videoFilter += `,subtitles='${escapedSubtitlePath}'`;
    }
    args.push("-vf", videoFilter, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", outputPath);
    try { await execFileAsync(env.FFMPEG_PATH, args, { maxBuffer: 1024 * 1024 }); }
    catch (error) { throw new Error(`FFmpeg render thất bại. Kiểm tra FFMPEG_PATH (${env.FFMPEG_PATH}). ${error instanceof Error ? error.message : ""}`); }
    await prisma.asset.deleteMany({
      where: { creativeId, type: AssetType.FINAL_VIDEO },
    });
    const info = await fileInfo(outputPath);
    const asset = await prisma.asset.create({ data: { creativeId, type: AssetType.FINAL_VIDEO, localPath: storageKey(outputPath), ...info, metadata: { canvas: "1080x1920", nativeAudioKept: !voice, voiceReplacement: Boolean(voice), subtitlesBurned: Boolean(subtitlePath) }, storageProvider: "LOCAL", machineLabel: env.MACHINE_LABEL } });
    await prisma.creative.update({ where: { id: creativeId }, data: { status: CreativeStatus.FINAL_RENDERED } });
    return asset;
  }
}

export const mediaService = new MediaService();
