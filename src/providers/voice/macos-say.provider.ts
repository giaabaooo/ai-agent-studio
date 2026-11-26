import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { AudioSegmentResult, VoiceOptions, VoiceProvider } from "./voice-provider.interface";
import { env } from "@/lib/env";

const execFileAsync = promisify(execFile);

export class MacOSSayVoiceProvider implements VoiceProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.MEDIA_ROOT, "voices");
  }

  async generateSpeech(
    text: string,
    outputSubPath: string,
    options?: VoiceOptions
  ): Promise<AudioSegmentResult> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const uniqueId = crypto.randomBytes(6).toString("hex");
    const aiffPath = path.join(this.baseDir, `${outputSubPath}_${uniqueId}.aiff`);
    const wavPath = path.join(this.baseDir, `${outputSubPath}_${uniqueId}.wav`);

    const voiceArgs: string[] = ["-o", aiffPath];
    if (options?.voiceName) {
      voiceArgs.push("-v", options.voiceName);
    }
    if (options?.speakingRate) {
      const rateWpm = Math.round(180 * options.speakingRate);
      voiceArgs.push("-r", rateWpm.toString());
    }
    voiceArgs.push(text);

    // 1. Run macOS `say`
    try {
      await execFileAsync("say", voiceArgs);
    } catch {
      // Fallback without voice name if specified voice is not installed
      await execFileAsync("say", ["-o", aiffPath, text]);
    }

    // 2. Convert AIFF to standard WAV using FFmpeg if available
    let finalPath = aiffPath;
    try {
      await execFileAsync(env.FFMPEG_PATH, ["-y", "-i", aiffPath, wavPath]);
      await fs.unlink(aiffPath); // Remove intermediate AIFF
      finalPath = wavPath;
    } catch {
      // If ffmpeg conversion fails, keep aiffPath
    }

    const relativePath = path.relative(path.resolve(process.cwd(), env.MEDIA_ROOT), finalPath).split(path.sep).join("/");
    // Rough estimate of duration: ~150 words per minute if not probed
    const words = text.trim().split(/\s+/).length;
    const durationSec = Math.max(1.0, Math.round((words / 2.5) * 10) / 10);

    return {
      localPath: relativePath,
      durationSec,
    };
  }
}

export const macOsSayVoiceProvider = new MacOSSayVoiceProvider();
