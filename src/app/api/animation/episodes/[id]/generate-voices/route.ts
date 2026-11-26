import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnimationAssetType } from "@prisma/client";
import { env } from "@/lib/env";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";

const execFileAsync = promisify(execFile);

// Helper to clean dialogue line (strip quotes and prefix)
function cleanDialogueText(raw: string): string {
  return raw
    .replace(/^["'“‘]+|["'”’]+$/g, "")
    .replace(/^.*?:/g, "")
    .trim();
}

// Voice mapping for Xóm Mít Na characters in Gemini TTS
function getVoiceForSpeaker(speakerName: string): string {
  const lower = speakerName.toLowerCase();
  if (lower.includes("mít") || lower.includes("mit")) return "Puck"; // Energetic boyish voice
  if (lower.includes("na")) return "Leda"; // Youthful, sweet girl voice
  if (lower.includes("bà") || lower.includes("sen")) return "Kore"; // Warm, caring adult voice
  if (lower.includes("bí") || lower.includes("bo")) return "Aoede"; // Cheerful breezy voice
  return "Puck";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const sceneId = body.sceneId as string | undefined;

    const episode = await prisma.animationEpisode.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            series: {
              include: {
                characters: true,
              },
            },
          },
        },
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: "Không tìm thấy tập phim" }, { status: 404 });
    }

    const apiKey = (body.geminiApiKey as string)?.trim() || env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY để tự động sinh giọng thoại" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Target scenes with dialogue
    let targetScenes = episode.scenes.filter((s) => s.dialogue && s.dialogue.trim().length > 0);
    if (sceneId) {
      targetScenes = episode.scenes.filter((s) => s.id === sceneId && s.dialogue && s.dialogue.trim().length > 0);
    }

    if (targetScenes.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Không có cảnh nào chứa lời thoại để sinh giọng đọc",
        generatedCount: 0,
      });
    }

    const voicesDir = path.join(process.cwd(), "media/animation/voices");
    await fs.mkdir(voicesDir, { recursive: true });

    const results = [];

    for (const scene of targetScenes) {
      const dialogueText = scene.dialogue!.trim();

      // Split dialogue if there are multiple turns separated by "/" or newlines
      const rawTurns = dialogueText
        .split(/\/|\n/)
        .map((t) => t.trim())
        .filter(Boolean);

      const turnFiles: string[] = [];

      for (let turnIdx = 0; turnIdx < rawTurns.length; turnIdx++) {
        const turnStr = rawTurns[turnIdx];
        const colonIdx = turnStr.indexOf(":");
        let speaker = "Mít";
        let speech = turnStr;

        if (colonIdx > 0) {
          speaker = turnStr.substring(0, colonIdx).trim();
          speech = cleanDialogueText(turnStr.substring(colonIdx + 1));
        } else {
          speech = cleanDialogueText(turnStr);
        }

        if (!speech || speech.length === 0) continue;

        const voiceName = getVoiceForSpeaker(speaker);
        const tempPcm = path.join(voicesDir, `temp_${Date.now()}_${turnIdx}.pcm`);
        const tempWav = path.join(voicesDir, `temp_${Date.now()}_${turnIdx}.wav`);

        let generated = false;

        // 1. Try Google Gemini TTS
        try {
          const res = await ai.interactions.create({
            model: "gemini-2.5-flash-preview-tts",
            input: [{
              type: "user_input",
              content: [{ type: "text", text: speech }]
            }],
            response_format: { type: "audio" },
            generation_config: { speech_config: [{ voice: voiceName }] }
          });

          if (res.output_audio?.data) {
            await fs.writeFile(tempPcm, Buffer.from(res.output_audio.data, "base64"));
            // Convert raw PCM 24kHz mono to standard WAV using ffmpeg
            await execFileAsync(env.FFMPEG_PATH, [
              "-y",
              "-f", "s16le",
              "-ar", "24000",
              "-ac", "1",
              "-i", tempPcm,
              tempWav,
            ]);
            await fs.unlink(tempPcm).catch(() => {});
            turnFiles.push(tempWav);
            generated = true;
          }
        } catch (geminiErr: any) {
          console.warn(`Gemini TTS fallback for turn "${speech}":`, geminiErr.message);
        }

        // 2. Fallback to macOS `say -v Linh` if Gemini TTS encounters policy or network issue
        if (!generated && process.platform === "darwin") {
          try {
            const tempAiff = path.join(voicesDir, `temp_${Date.now()}_${turnIdx}.aiff`);
            await execFileAsync("say", ["-v", "Linh", "-o", tempAiff, speech]);
            await execFileAsync(env.FFMPEG_PATH, ["-y", "-i", tempAiff, tempWav]);
            await fs.unlink(tempAiff).catch(() => {});
            turnFiles.push(tempWav);
            generated = true;
          } catch (sayErr) {
            console.error("macOS say fallback failed:", sayErr);
          }
        }
      }

      if (turnFiles.length === 0) {
        continue;
      }

      // Merge turns into one audio track for the scene
      const finalWavName = `ep${episode.number}_scene${scene.orderIndex}_voice_${Date.now()}.wav`;
      const finalWavPath = path.join(voicesDir, finalWavName);

      if (turnFiles.length === 1) {
        await fs.rename(turnFiles[0], finalWavPath);
      } else {
        // Concat turn files with ffmpeg
        const inputs = turnFiles.flatMap((f) => ["-i", f]);
        const filterStr = turnFiles.map((_, i) => `[${i}:a]`).join("") + `concat=n=${turnFiles.length}:v=0:a=1[outa]`;
        await execFileAsync(env.FFMPEG_PATH, [
          "-y",
          ...inputs,
          "-filter_complex", filterStr,
          "-map", "[outa]",
          finalWavPath,
        ]);
        // Clean up individual turn files
        for (const f of turnFiles) {
          await fs.unlink(f).catch(() => {});
        }
      }

      const stat = await fs.stat(finalWavPath);

      // Clean up previous VOICE assets for this scene
      await prisma.sceneAsset.deleteMany({
        where: {
          sceneId: scene.id,
          assetType: AnimationAssetType.VOICE,
        },
      });

      // Save new approved VOICE asset
      const asset = await prisma.sceneAsset.create({
        data: {
          sceneId: scene.id,
          assetType: AnimationAssetType.VOICE,
          localPath: `animation/voices/${finalWavName}`,
          mimeType: "audio/wav",
          fileSize: stat.size,
          approved: true,
          version: 1,
          metadata: {
            generatedBy: "Google Gemini TTS (2.5 Flash)",
            dialogue: dialogueText,
          },
        },
      });

      results.push({ sceneOrder: scene.orderIndex, asset });
    }

    return NextResponse.json({
      success: true,
      message: `Đã sinh thành công ${results.length} đoạn giọng lồng tiếng cho tập ${episode.number}!`,
      generatedCount: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Sinh giọng thoại thất bại" },
      { status: 500 }
    );
  }
}
