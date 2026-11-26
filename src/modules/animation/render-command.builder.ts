export interface SceneClipInput {
  orderIndex: number;
  durationSec: number;
  absoluteVideoPath: string;
  absoluteAudioPath?: string;
}

export interface AudioTrackInput {
  type: "VOICE" | "SFX" | "MUSIC";
  absoluteAudioPath: string;
  offsetSec?: number;
}

export interface RenderCommandOptions {
  sceneClips: SceneClipInput[];
  audioTracks?: AudioTrackInput[];
  outputPath: string;
  replaceNativeAudio?: boolean;
  width?: number;
  height?: number;
  fps?: number;
}

export class RenderCommandBuilder {
  buildConcatFilterArgs(options: RenderCommandOptions): { args: string[]; concatFilter: string } {
    const width = options.width || 1080;
    const height = options.height || 1920;
    const fps = options.fps || 30;

    if (!options.sceneClips || options.sceneClips.length === 0) {
      throw new Error("Không có video cảnh nào để ghép nối");
    }

    const args: string[] = ["-y"];

    // 1. Add video inputs (indices 0 to numClips - 1)
    for (const clip of options.sceneClips) {
      args.push("-i", clip.absoluteVideoPath);
    }

    // 2. Add scene-level audio inputs if present
    const hasSceneAudio = options.sceneClips.some((c) => Boolean(c.absoluteAudioPath));
    const sceneAudioIndices: (number | null)[] = [];
    let nextInputIdx = options.sceneClips.length;

    if (hasSceneAudio) {
      for (const clip of options.sceneClips) {
        if (clip.absoluteAudioPath) {
          args.push("-i", clip.absoluteAudioPath);
          sceneAudioIndices.push(nextInputIdx++);
        } else {
          sceneAudioIndices.push(null);
        }
      }
    }

    // 3. Add global audio tracks if any
    const globalAudioStartIndex = nextInputIdx;
    if (options.audioTracks) {
      for (const track of options.audioTracks) {
        args.push("-i", track.absoluteAudioPath);
        nextInputIdx++;
      }
    }

    const filterParts: string[] = [];
    const numClips = options.sceneClips.length;

    // Scale and pad each video input
    for (let i = 0; i < numClips; i++) {
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v${i}]`
      );
    }

    let finalFilter = "";

    if (hasSceneAudio) {
      // Prepare audio stream for each scene (either apad audio input or silence)
      for (let i = 0; i < numClips; i++) {
        const audioIdx = sceneAudioIndices[i];
        const clipDur = options.sceneClips[i].durationSec || 5;
        if (audioIdx !== null) {
          filterParts.push(`[${audioIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`);
        } else {
          filterParts.push(`aevalsrc=0:d=${clipDur}:s=44100:c=stereo[a${i}]`);
        }
      }

      // Interleave video and audio for concat
      const concatInputs = options.sceneClips.map((_, i) => `[v${i}][a${i}]`).join("");
      filterParts.push(`${concatInputs}concat=n=${numClips}:v=1:a=1[outv][outa]`);
      finalFilter = filterParts.join(";");

      args.push(
        "-filter_complex",
        finalFilter,
        "-map",
        "[outv]",
        "-map",
        "[outa]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        options.outputPath
      );
    } else if (options.audioTracks && options.audioTracks.length > 0) {
      const vConcatInputs = options.sceneClips.map((_, i) => `[v${i}]`).join("");
      filterParts.push(`${vConcatInputs}concat=n=${numClips}:v=1:a=0[outv]`);
      finalFilter = filterParts.join(";");

      args.push(
        "-filter_complex",
        finalFilter,
        "-map",
        "[outv]",
        "-map",
        `${globalAudioStartIndex}:a`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        options.outputPath
      );
    } else {
      // Concat video only
      const vConcatInputs = options.sceneClips.map((_, i) => `[v${i}]`).join("");
      filterParts.push(`${vConcatInputs}concat=n=${numClips}:v=1:a=0[outv]`);
      finalFilter = filterParts.join(";");

      args.push(
        "-filter_complex",
        finalFilter,
        "-map",
        "[outv]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        options.outputPath
      );
    }

    return { args, concatFilter: finalFilter };
  }
}

export const renderCommandBuilder = new RenderCommandBuilder();
