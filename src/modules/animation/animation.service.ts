import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  SeriesStatus,
  EpisodeStatus,
  EpisodeParseStatus,
  CharacterStatus,
  CharacterReferenceType,
  SceneStatus,
  AnimationAssetType,
  RenderStatus,
  ScriptImportStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";
import { docxParserService } from "./docx-parser.service";
import { promptBuilderService, CharacterWithRefs } from "./prompt-builder.service";
import { renderCommandBuilder } from "./render-command.builder";
import {
  ParsedScriptPayload,
  ScriptEpisodeDraft,
} from "@/lib/schemas/animation.schema";

const execFileAsync = promisify(execFile);

function mediaRoot(): string {
  return path.resolve(process.cwd(), env.MEDIA_ROOT);
}

function storageKey(inputPath: string): string {
  const root = mediaRoot();
  const cleaned = inputPath.replace(/^(\.\/)?media[\\/]/, "");
  const absolutePath = path.isAbsolute(cleaned) ? cleaned : path.resolve(root, cleaned);
  const key = path.relative(root, absolutePath);
  if (!key || key.startsWith("..") || path.isAbsolute(key)) {
    throw new Error("Đường dẫn tệp nằm ngoài MEDIA_ROOT");
  }
  return key.split(path.sep).join("/");
}

async function getFileInfo(absolutePath: string) {
  const stat = await fs.stat(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return { fileSize: stat.size, mimeType: mimeTypes[ext] || "application/octet-stream" };
}

export class AnimationService {
  // ==========================================
  // 1. IMPORT DRAFT WORKFLOW
  // ==========================================

  async createImportDraft(
    buffer: Buffer,
    originalFileName: string
  ) {
    if (!buffer || buffer.length === 0) {
      throw new Error("Tệp kịch bản rỗng");
    }

    // Save docx file into storage
    const saved = await localStorageProvider.saveFile(
      buffer,
      "scripts",
      originalFileName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // Compute sha256 hash
    const sourceDocHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Parse docx
    const parsedPayload = await docxParserService.parseDocx(buffer);

    // Save draft in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const draft = await prisma.scriptImportDraft.create({
      data: {
        sourcePath: saved.localPath,
        sourceDocHash,
        parsedJson: parsedPayload as any,
        warnings: parsedPayload.warnings as any,
        status: ScriptImportStatus.DRAFT,
        expiresAt,
      },
    });

    return {
      draftId: draft.id,
      series: parsedPayload.series,
      charactersCount: parsedPayload.characters.length,
      episodesCount: parsedPayload.episodes.length,
      warningsCount: parsedPayload.warnings.length,
      warnings: parsedPayload.warnings,
      previewEpisodes: parsedPayload.episodes.slice(0, 5),
    };
  }

  async getImportDraft(id: string) {
    const draft = await prisma.scriptImportDraft.findUnique({
      where: { id },
    });
    if (!draft) {
      throw new Error("Không tìm thấy bản nháp import kịch bản");
    }
    return draft;
  }

  async updateImportDraft(id: string, parsedJson: Partial<ParsedScriptPayload>) {
    const draft = await prisma.scriptImportDraft.findUnique({ where: { id } });
    if (!draft) throw new Error("Không tìm thấy bản nháp import kịch bản");
    if (draft.status !== ScriptImportStatus.DRAFT) {
      throw new Error("Bản nháp này đã được xử lý hoặc hủy");
    }

    const currentJson = draft.parsedJson as any;
    const merged = { ...currentJson, ...parsedJson };

    return prisma.scriptImportDraft.update({
      where: { id },
      data: { parsedJson: merged },
    });
  }

  async discardImportDraft(id: string) {
    const draft = await prisma.scriptImportDraft.findUnique({ where: { id } });
    if (!draft) throw new Error("Không tìm thấy bản nháp import kịch bản");
    return prisma.scriptImportDraft.update({
      where: { id },
      data: { status: ScriptImportStatus.DISCARDED },
    });
  }

  async confirmImportDraft(
    draftId: string,
    options: {
      title?: string;
      slug?: string;
      includeCharacters?: boolean;
      selectedEpisodeNumbers?: number[];
    } = {}
  ) {
    const draft = await prisma.scriptImportDraft.findUnique({
      where: { id: draftId },
    });
    if (!draft) {
      throw new Error("Không tìm thấy bản nháp import kịch bản");
    }
    if (draft.status === ScriptImportStatus.CONFIRMED) {
      throw new Error("Bản nháp này đã được xác nhận trước đó");
    }

    const parsed = draft.parsedJson as unknown as ParsedScriptPayload;
    const title = options.title || parsed.series.title || "Xóm Mít Na";
    const slug = options.slug || parsed.series.slug || "xom-mit-na";
    const selectedNums = options.selectedEpisodeNumbers
      ? new Set(options.selectedEpisodeNumbers)
      : null;

    const episodesToImport = selectedNums
      ? parsed.episodes.filter((e) => selectedNums.has(e.number))
      : parsed.episodes;

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or update Series
      const series = await tx.animationSeries.upsert({
        where: { slug },
        update: {
          title,
          sourceDocPath: draft.sourcePath,
          sourceDocHash: draft.sourceDocHash,
          status: SeriesStatus.ACTIVE,
          styleGuide: parsed.series.styleGuide as any,
          safetyRules: parsed.series.safetyRules as any,
        },
        create: {
          title,
          slug,
          sourceDocPath: draft.sourcePath,
          sourceDocHash: draft.sourceDocHash,
          status: SeriesStatus.ACTIVE,
          styleGuide: parsed.series.styleGuide as any,
          safetyRules: parsed.series.safetyRules as any,
        },
      });

      // 2. Create or update Season 1
      const season = await tx.animationSeason.upsert({
        where: {
          seriesId_number: {
            seriesId: series.id,
            number: 1,
          },
        },
        update: {
          title: "Mùa 1",
        },
        create: {
          seriesId: series.id,
          number: 1,
          title: "Mùa 1",
        },
      });

      // 3. Import Characters if requested
      if (options.includeCharacters !== false && parsed.characters) {
        for (const char of parsed.characters) {
          const charRecord = await tx.animationCharacter.upsert({
            where: {
              seriesId_name: {
                seriesId: series.id,
                name: char.name,
              },
            },
            update: {
              role: char.role,
              ageDescription: char.ageDescription,
              appearanceLock: char.appearanceLock,
              outfitLock: char.outfitLock,
              personality: char.personality,
              voiceRule: char.voiceRule,
              colorPalette: char.colorPalette as any,
              masterPrompt: char.masterPrompt,
              negativePrompt: char.negativePrompt,
              safetyRules: char.safetyRules,
              status: CharacterStatus.ACTIVE,
            },
            create: {
              seriesId: series.id,
              name: char.name,
              role: char.role,
              ageDescription: char.ageDescription,
              appearanceLock: char.appearanceLock,
              outfitLock: char.outfitLock,
              personality: char.personality,
              voiceRule: char.voiceRule,
              colorPalette: char.colorPalette as any,
              masterPrompt: char.masterPrompt,
              negativePrompt: char.negativePrompt,
              safetyRules: char.safetyRules,
              status: CharacterStatus.ACTIVE,
            },
          });

          // Auto-assign character reference asset if not already present
          const existingRef = await tx.characterReferenceAsset.findFirst({
            where: {
              characterId: charRecord.id,
              referenceType: CharacterReferenceType.FULL_BODY_FRONT,
            },
          });

          if (!existingRef) {
            const defaultAssetMap: Record<string, string> = {
              "Mít": "characters/mit_full_body_front.png",
              "Na": "characters/na_full_body_front.png",
              "Bà Sen": "characters/ba_sen_full_body_front.png",
              "Bí Bo": "characters/bibo_full_body_front.png",
            };
            const mappedPath = defaultAssetMap[char.name];
            if (mappedPath) {
              const absPath = path.join(mediaRoot(), mappedPath);
              try {
                const stat = await fs.stat(absPath);
                await tx.characterReferenceAsset.create({
                  data: {
                    characterId: charRecord.id,
                    referenceType: CharacterReferenceType.FULL_BODY_FRONT,
                    localPath: mappedPath,
                    mimeType: "image/png",
                    fileSize: stat.size,
                    approved: true,
                    version: 1,
                    metadata: {
                      label: "Ảnh chính diện tạo tự động khi import kịch bản",
                      autoGenerated: true,
                    },
                  },
                });
              } catch {
                // Ignore if asset file doesn't exist yet
              }
            }
          }
        }
      }

      // 4. Import Episodes and Scenes
      for (const ep of episodesToImport) {
        const episode = await tx.animationEpisode.upsert({
          where: {
            seasonId_number: {
              seasonId: season.id,
              number: ep.number,
            },
          },
          update: {
            title: ep.title,
            logline: ep.logline,
            summary: ep.summary,
            targetDurationSec: ep.targetDurationSec || 50,
            sourceContent: ep.sourceContent,
            parseStatus: ep.parseStatus || EpisodeParseStatus.PARSED,
            status: EpisodeStatus.STORYBOARD_READY,
            metadata: {
              storyline: ep.storyline,
              targetAge: ep.targetAge,
              characters: ep.characters,
              setting: ep.setting,
              coreEmotion: ep.coreEmotion,
              dialogues: ep.dialogues,
            },
          },
          create: {
            seasonId: season.id,
            number: ep.number,
            title: ep.title,
            logline: ep.logline,
            summary: ep.summary,
            targetDurationSec: ep.targetDurationSec || 50,
            sourceContent: ep.sourceContent,
            parseStatus: ep.parseStatus || EpisodeParseStatus.PARSED,
            status: EpisodeStatus.STORYBOARD_READY,
            metadata: {
              storyline: ep.storyline,
              targetAge: ep.targetAge,
              characters: ep.characters,
              setting: ep.setting,
              coreEmotion: ep.coreEmotion,
              dialogues: ep.dialogues,
            },
          },
        });

        // Upsert scenes for this episode
        for (const sc of ep.scenes) {
          await tx.episodeScene.upsert({
            where: {
              episodeId_orderIndex: {
                episodeId: episode.id,
                orderIndex: sc.orderIndex,
              },
            },
            update: {
              startSec: sc.startSec,
              endSec: sc.endSec,
              durationSec: sc.durationSec,
              setting: sc.setting || "Ngôi nhà Nắng",
              action: sc.action,
              dialogue: sc.dialogue,
              emotionDirection: sc.emotionDirection,
              soundDirection: sc.soundDirection,
              visualPrompt: sc.visualPrompt,
              negativePrompt: sc.negativePrompt,
              continuityNotes: sc.continuityNotes,
              status: SceneStatus.PROMPT_READY,
            },
            create: {
              episodeId: episode.id,
              orderIndex: sc.orderIndex,
              startSec: sc.startSec,
              endSec: sc.endSec,
              durationSec: sc.durationSec,
              setting: sc.setting || "Ngôi nhà Nắng",
              action: sc.action,
              dialogue: sc.dialogue,
              emotionDirection: sc.emotionDirection,
              soundDirection: sc.soundDirection,
              visualPrompt: sc.visualPrompt,
              negativePrompt: sc.negativePrompt,
              continuityNotes: sc.continuityNotes,
              status: SceneStatus.PROMPT_READY,
            },
          });
        }
      }

      // Mark draft as confirmed
      await tx.scriptImportDraft.update({
        where: { id: draftId },
        data: {
          status: ScriptImportStatus.CONFIRMED,
          seriesId: series.id,
        },
      });

      return {
        seriesId: series.id,
        slug: series.slug,
        seasonId: season.id,
        importedEpisodesCount: episodesToImport.length,
      };
    });

    return result;
  }

  // ==========================================
  // 2. SERIES & CHARACTERS
  // ==========================================

  async listSeries() {
    return prisma.animationSeries.findMany({
      include: {
        seasons: {
          include: {
            _count: { select: { episodes: true } },
          },
        },
        characters: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSeries(id: string) {
    const series = await prisma.animationSeries.findUnique({
      where: { id },
      include: {
        seasons: {
          include: {
            episodes: {
              orderBy: { number: "asc" },
              include: {
                _count: { select: { scenes: true, renders: true } },
              },
            },
          },
        },
        characters: {
          include: {
            referenceAssets: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    if (!series) throw new Error("Không tìm thấy series hoạt hình");
    return series;
  }

  async updateSeries(id: string, data: any) {
    return prisma.animationSeries.update({
      where: { id },
      data,
    });
  }

  async listCharacters(seriesId: string) {
    return prisma.animationCharacter.findMany({
      where: { seriesId },
      include: {
        referenceAssets: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getCharacter(id: string) {
    const character = await prisma.animationCharacter.findUnique({
      where: { id },
      include: {
        referenceAssets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!character) throw new Error("Không tìm thấy nhân vật");

    const checklist = promptBuilderService.buildChecklist({
      ...character,
      referenceAssets: character.referenceAssets,
    });

    return {
      ...character,
      checklist,
    };
  }

  async createCharacter(seriesId: string, data: any) {
    return prisma.animationCharacter.create({
      data: {
        seriesId,
        ...data,
      },
    });
  }

  async updateCharacter(id: string, data: any) {
    return prisma.animationCharacter.update({
      where: { id },
      data,
    });
  }

  async attachReferenceAsset(
    characterId: string,
    referenceType: CharacterReferenceType,
    localPath: string,
    mimeType: string,
    metadata?: any
  ) {
    const character = await prisma.animationCharacter.findUnique({
      where: { id: characterId },
      include: { referenceAssets: { where: { referenceType } } },
    });
    if (!character) throw new Error("Không tìm thấy nhân vật");

    const storageKeyValue = storageKey(localPath);
    const version = character.referenceAssets.length + 1;

    return prisma.characterReferenceAsset.create({
      data: {
        characterId,
        referenceType,
        localPath: storageKeyValue,
        mimeType,
        approved: false, // Default is draft; user must explicitly approve
        version,
        metadata: metadata || null,
      },
    });
  }

  async updateReferenceAsset(id: string, approved: boolean, metadata?: any) {
    return prisma.characterReferenceAsset.update({
      where: { id },
      data: {
        approved,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  async deleteReferenceAsset(id: string) {
    return prisma.characterReferenceAsset.delete({
      where: { id },
    });
  }

  // ==========================================
  // 3. EPISODES & STORYBOARD
  // ==========================================

  async getEpisode(id: string) {
    const episode = await prisma.animationEpisode.findUnique({
      where: { id },
      include: {
        season: {
          select: {
            id: true,
            number: true,
            title: true,
            series: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: {
              orderBy: { version: "desc" },
            },
          },
        },
        renders: {
          orderBy: { version: "desc" },
        },
      },
    });
    if (!episode) throw new Error("Không tìm thấy tập phim");
    return episode;
  }

  async updateEpisode(id: string, data: any) {
    return prisma.animationEpisode.update({
      where: { id },
      data,
    });
  }

  async updateScene(sceneId: string, data: any) {
    const scene = await prisma.episodeScene.findUnique({ where: { id: sceneId } });
    if (!scene) throw new Error("Không tìm thấy cảnh");
    return prisma.episodeScene.update({
      where: { id: sceneId },
      data,
    });
  }

  async reorderScenes(episodeId: string, sceneIds: string[]) {
    return prisma.$transaction(
      sceneIds.map((id, index) =>
        prisma.episodeScene.update({
          where: { id },
          data: { orderIndex: index + 1 },
        })
      )
    );
  }

  async attachSceneAsset(
    sceneId: string,
    assetType: AnimationAssetType,
    localPath: string,
    mimeType: string,
    fileSize: number,
    metadata?: any
  ) {
    const scene = await prisma.episodeScene.findUnique({
      where: { id: sceneId },
      include: { assets: { where: { assetType } } },
    });
    if (!scene) throw new Error("Không tìm thấy cảnh");

    const storageKeyValue = storageKey(localPath);
    const version = scene.assets.length + 1;

    const asset = await prisma.sceneAsset.create({
      data: {
        sceneId,
        assetType,
        localPath: storageKeyValue,
        mimeType,
        fileSize,
        version,
        approved: false, // Default draft; user must approve
        metadata: metadata || null,
      },
    });

    return asset;
  }

  async updateSceneAsset(id: string, approved: boolean, metadata?: any) {
    return prisma.sceneAsset.update({
      where: { id },
      data: {
        approved,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  async deleteSceneAsset(id: string) {
    return prisma.sceneAsset.delete({
      where: { id },
    });
  }

  async getScenePromptBundle(sceneId: string) {
    const scene = await prisma.episodeScene.findUnique({
      where: { id: sceneId },
      include: {
        episode: {
          include: {
            season: {
              include: {
                series: {
                  include: {
                    characters: {
                      include: {
                        referenceAssets: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!scene) throw new Error("Không tìm thấy cảnh");

    const series = scene.episode.season.series;
    const allCharacters = series.characters;

    // Filter characters mentioned in scene action/dialogue or default to all series characters
    const relevantCharacters = allCharacters.filter((c) => {
      const name = c.name.toLowerCase();
      const inAction = scene.action.toLowerCase().includes(name);
      const inDialogue = scene.dialogue?.toLowerCase().includes(name);
      return inAction || inDialogue;
    });

    const charactersToUse = relevantCharacters.length > 0 ? relevantCharacters : allCharacters;

    return promptBuilderService.buildPromptBundle({
      scene,
      seriesStyleGuide: series.styleGuide as any,
      characters: charactersToUse,
    });
  }

  // ==========================================
  // 4. RENDER PREFLIGHT & ASSEMBLY
  // ==========================================

  async validateEpisodeRender(episodeId: string) {
    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: true,
          },
        },
      },
    });
    if (!episode) throw new Error("Không tìm thấy tập phim");

    const missingVideoSceneIndices: number[] = [];
    const missingApprovedVideoScenes: number[] = [];

    for (const scene of episode.scenes) {
      const hasRawVideo = scene.assets.some((a) => a.assetType === AnimationAssetType.RAW_VIDEO);
      const hasApprovedVideo = scene.assets.some(
        (a) => a.assetType === AnimationAssetType.RAW_VIDEO && a.approved
      );

      if (!hasRawVideo) missingVideoSceneIndices.push(scene.orderIndex);
      else if (!hasApprovedVideo) missingApprovedVideoScenes.push(scene.orderIndex);
    }

    const canRender = missingVideoSceneIndices.length === 0 && missingApprovedVideoScenes.length === 0;

    const issues: string[] = [];
    if (missingVideoSceneIndices.length > 0) {
      issues.push(`Các cảnh chưa có video raw: Cảnh ${missingVideoSceneIndices.join(", ")}`);
    }
    if (missingApprovedVideoScenes.length > 0) {
      issues.push(`Các cảnh chưa được duyệt video (APPROVED): Cảnh ${missingApprovedVideoScenes.join(", ")}`);
    }

    return {
      canRender,
      totalScenes: episode.scenes.length,
      readyScenesCount: episode.scenes.length - missingVideoSceneIndices.length - missingApprovedVideoScenes.length,
      missingVideoSceneIndices,
      missingApprovedVideoScenes,
      issues,
    };
  }

  async renderEpisode(
    episodeId: string,
    options: { replaceNativeAudio?: boolean; burnSubtitles?: boolean } = {}
  ) {
    const preflight = await this.validateEpisodeRender(episodeId);
    if (!preflight.canRender) {
      throw new Error(`Chưa đủ điều kiện render: ${preflight.issues.join(". ")}`);
    }

    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: {
              where: {
                approved: true,
                assetType: { in: [AnimationAssetType.RAW_VIDEO, AnimationAssetType.VOICE, AnimationAssetType.SFX, AnimationAssetType.MUSIC] },
              },
              orderBy: { version: "desc" },
            },
          },
        },
        renders: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!episode) throw new Error("Không tìm thấy tập phim");

    const sceneClips = episode.scenes.map((scene) => {
      const videoAsset = scene.assets.find((a) => a.assetType === AnimationAssetType.RAW_VIDEO);
      if (!videoAsset) throw new Error(`Cảnh ${scene.orderIndex} thiếu video được duyệt`);
      const voiceAsset = scene.assets.find((a) => a.assetType === AnimationAssetType.VOICE);
      const meta = (videoAsset.metadata as any) || {};
      const clipAudioRelPath = meta.audioPath || voiceAsset?.localPath;
      const absoluteAudioPath = clipAudioRelPath ? path.join(mediaRoot(), clipAudioRelPath) : undefined;

      return {
        orderIndex: scene.orderIndex,
        durationSec: scene.durationSec,
        absoluteVideoPath: path.join(mediaRoot(), videoAsset.localPath),
        absoluteAudioPath,
      };
    });

    // Check files exist
    for (const clip of sceneClips) {
      await fs.access(clip.absoluteVideoPath);
    }

    const outputDir = path.join(mediaRoot(), "finals", "animation");
    await fs.mkdir(outputDir, { recursive: true });

    const newVersion = (episode.renders[0]?.version || 0) + 1;
    const outputPath = path.join(
      outputDir,
      `episode-${episode.number}-v${newVersion}-${crypto.randomBytes(4).toString("hex")}.mp4`
    );

    const { args } = renderCommandBuilder.buildConcatFilterArgs({
      sceneClips,
      outputPath,
      replaceNativeAudio: options.replaceNativeAudio,
    });

    try {
      await execFileAsync(env.FFMPEG_PATH, args, { maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      throw new Error(
        `FFmpeg render tập phim thất bại. Kiểm tra FFMPEG_PATH (${env.FFMPEG_PATH}). ${
          error instanceof Error ? error.message : ""
        }`
      );
    }

    const fileInfo = await getFileInfo(outputPath);

    // Deactivate previous active renders (without deleting files!)
    await prisma.episodeRender.updateMany({
      where: { episodeId, active: true },
      data: { active: false },
    });

    // Create new render record
    const renderRecord = await prisma.episodeRender.create({
      data: {
        episodeId,
        localPath: storageKey(outputPath),
        version: newVersion,
        active: true,
        status: RenderStatus.COMPLETED,
        renderOptions: options as any,
        metadata: {
          canvas: "1080x1920",
          scenesCount: sceneClips.length,
          fileSize: fileInfo.fileSize,
        },
      },
    });

    // Update episode status
    await prisma.animationEpisode.update({
      where: { id: episodeId },
      data: { status: EpisodeStatus.RENDERED },
    });

    return renderRecord;
  }

  async autoGenerateEpisodeVideos(episodeId: string) {
    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        season: {
          include: {
            series: {
              include: {
                characters: {
                  include: {
                    referenceAssets: {
                      where: { approved: true },
                      orderBy: { version: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: {
            assets: {
              orderBy: { version: "desc" },
            },
          },
        },
      },
    });

    if (!episode) throw new Error("Không tìm thấy tập phim");

    const characters = episode.season.series.characters;

    const videoDir = path.join(mediaRoot(), "animation", "videos");
    await fs.mkdir(videoDir, { recursive: true });

    // 1. Ensure every scene has an approved RAW_VIDEO
    for (const scene of episode.scenes) {
      const existingVideo = scene.assets.find(
        (a) => a.assetType === AnimationAssetType.RAW_VIDEO && a.approved
      );
      if (existingVideo) {
        try {
          await fs.access(path.join(mediaRoot(), existingVideo.localPath));
          // File exists on disk, reuse it
          continue;
        } catch {
          // File missing on disk, regenerate below
        }
      }

      // Determine visual source: approved keyframe > character reference > fallback
      let sourceLocalPath: string | null = null;
      const keyframe = scene.assets.find(
        (a) => a.assetType === AnimationAssetType.KEYFRAME && a.approved
      );
      if (keyframe) {
        sourceLocalPath = keyframe.localPath;
      } else {
        for (const char of characters) {
          if (
            (scene.action && scene.action.includes(char.name)) ||
            (scene.dialogue && scene.dialogue.includes(char.name))
          ) {
            if (char.referenceAssets[0]) {
              sourceLocalPath = char.referenceAssets[0].localPath;
              break;
            }
          }
        }
        if (!sourceLocalPath) {
          const mit = characters.find((c) => c.name === "Mít");
          sourceLocalPath = mit?.referenceAssets[0]?.localPath || "characters/mit_full_body_front.png";
        }
      }

      const inputImagePath = path.join(mediaRoot(), sourceLocalPath);
      try {
        await fs.access(inputImagePath);
      } catch {
        throw new Error(
          `Không tìm thấy ảnh nguồn ${sourceLocalPath} để tạo video cho Cảnh ${scene.orderIndex}`
        );
      }

      const duration = scene.durationSec || 5;
      const videoFilename = `ep${episode.number}_scene${scene.orderIndex}_${crypto.randomBytes(4).toString("hex")}.mp4`;
      const outputVideoPath = path.join(videoDir, videoFilename);
      const localPath = `animation/videos/${videoFilename}`;

      // Run FFmpeg: 9:16 vertical 1080x1920 with smooth pan/zoom
      const vf = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0F172A,setsar=1,fps=30`;
      await execFileAsync(env.FFMPEG_PATH, [
        "-y",
        "-loop", "1",
        "-i", inputImagePath,
        "-t", duration.toString(),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        outputVideoPath,
      ]);

      const stat = await fs.stat(outputVideoPath);

      // Create RAW_VIDEO asset in DB
      await prisma.sceneAsset.create({
        data: {
          sceneId: scene.id,
          assetType: AnimationAssetType.RAW_VIDEO,
          localPath,
          mimeType: "video/mp4",
          fileSize: stat.size,
          approved: true,
          version: 1,
          metadata: {
            generatedOnWeb: true,
            durationSec: duration,
            sourceImage: sourceLocalPath,
          },
        },
      });
    }

    // 2. All scenes have approved RAW_VIDEO! Now render final episode video
    const renderRecord = await this.renderEpisode(episodeId, {
      replaceNativeAudio: false,
    });

    // 3. Return full updated episode
    const updatedEpisode = await this.getEpisode(episodeId);
    return {
      episode: updatedEpisode,
      render: renderRecord,
    };
  }

  async getFullEpisodePromptBundle(episodeId: string) {
    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        season: {
          include: {
            series: {
              include: {
                characters: {
                  include: {
                    referenceAssets: {
                      orderBy: { version: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
        scenes: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!episode) throw new Error("Không tìm thấy tập phim");

    const characters = episode.season.series.characters as unknown as CharacterWithRefs[];
    const promptBundle = promptBuilderService.buildFullEpisodePrompt({
      episode: {
        number: episode.number,
        title: episode.title,
        logline: episode.logline,
        summary: episode.summary,
        targetDurationSec: episode.targetDurationSec,
        scenes: episode.scenes,
      },
      seriesStyleGuide: episode.season.series.styleGuide,
      characters,
    });

    return {
      episode,
      promptBundle,
    };
  }

  async saveFullEpisodeUploadedVideo(
    episodeId: string,
    sourceFilePath: string,
    originalFileName: string
  ) {
    const episode = await prisma.animationEpisode.findUnique({
      where: { id: episodeId },
      include: {
        renders: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!episode) throw new Error("Không tìm thấy tập phim");

    const outputDir = path.join(mediaRoot(), "finals", "animation");
    await fs.mkdir(outputDir, { recursive: true });

    const newVersion = (episode.renders[0]?.version || 0) + 1;
    const filename = `episode-${episode.number}-full-v${newVersion}-${crypto.randomBytes(4).toString("hex")}.mp4`;
    const destinationPath = path.join(outputDir, filename);

    await fs.copyFile(sourceFilePath, destinationPath);
    const stat = await fs.stat(destinationPath);

    // Deactivate previous active renders
    await prisma.episodeRender.updateMany({
      where: { episodeId, active: true },
      data: { active: false },
    });

    // Create new render record
    const renderRecord = await prisma.episodeRender.create({
      data: {
        episodeId,
        localPath: storageKey(destinationPath),
        version: newVersion,
        active: true,
        status: RenderStatus.COMPLETED,
        renderOptions: { isFullEpisodeUpload: true } as any,
        metadata: {
          canvas: "1080x1920",
          originalFileName,
          isFullEpisodeUpload: true,
          fileSize: stat.size,
        },
      },
    });

    // Update episode status
    await prisma.animationEpisode.update({
      where: { id: episodeId },
      data: { status: EpisodeStatus.RENDERED },
    });

    return renderRecord;
  }
}

export const animationService = new AnimationService();
