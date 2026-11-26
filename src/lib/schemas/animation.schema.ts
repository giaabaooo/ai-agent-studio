import { z } from "zod";
import {
  SeriesStatus,
  EpisodeParseStatus,
  EpisodeStatus,
  CharacterStatus,
  CharacterReferenceType,
  SceneStatus,
  AnimationAssetType,
  RenderStatus,
  ScriptImportStatus,
} from "@prisma/client";

export const scriptImportUploadSchema = z.object({
  subFolder: z.string().default("scripts"),
});

export const scriptSceneDraftSchema = z.object({
  orderIndex: z.number().int().min(1),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  durationSec: z.number().min(0),
  setting: z.string().default("Ngôi nhà Nắng"),
  action: z.string(),
  dialogue: z.string().nullable().optional(),
  emotionDirection: z.string().nullable().optional(),
  soundDirection: z.string().nullable().optional(),
  visualPrompt: z.string(),
  negativePrompt: z.string().default(""),
  continuityNotes: z.string().nullable().optional(),
});

export const scriptDialogueDraftSchema = z.object({
  sceneIndex: z.number().int().min(1),
  character: z.string(),
  dialogue: z.string(),
  direction: z.string().nullable().optional(),
});

export const scriptEpisodeDraftSchema = z.object({
  number: z.number().int().min(1),
  title: z.string(),
  storyline: z.string().optional(),
  targetAge: z.string().optional(),
  targetDurationSec: z.number().int().default(50),
  characters: z.array(z.string()).default([]),
  setting: z.string().default("Ngôi nhà Nắng"),
  coreEmotion: z.string().optional(),
  logline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  scenes: z.array(scriptSceneDraftSchema).default([]),
  dialogues: z.array(scriptDialogueDraftSchema).default([]),
  parseStatus: z.nativeEnum(EpisodeParseStatus).default(EpisodeParseStatus.PARSED),
  sourceContent: z.string().optional(),
});

export const scriptCharacterDraftSchema = z.object({
  name: z.string(),
  role: z.string(),
  ageDescription: z.string().optional(),
  appearanceLock: z.string(),
  outfitLock: z.string(),
  personality: z.string().optional(),
  voiceRule: z.string(),
  colorPalette: z.array(z.string()).optional(),
  masterPrompt: z.string(),
  negativePrompt: z.string(),
  safetyRules: z.string().optional(),
});

export const scriptImportWarningSchema = z.object({
  type: z.enum([
    "TIMELINE_OVERLAP",
    "LONG_SCENE",
    "ZERO_DURATION",
    "BI_BO_SPEECH",
    "MISSING_FIELD",
    "PARSE_AMBIGUITY",
  ]),
  episodeNumber: z.number().int().optional(),
  sceneIndex: z.number().int().optional(),
  message: z.string(),
  severity: z.enum(["WARNING", "ERROR"]).default("WARNING"),
});

export const parsedScriptPayloadSchema = z.object({
  series: z.object({
    title: z.string().default("Xóm Mít Na"),
    slug: z.string().default("xom-mit-na"),
    subtitle: z.string().optional(),
    seasonNumber: z.number().int().default(1),
    styleGuide: z.record(z.any()).optional(),
    safetyRules: z.record(z.any()).optional(),
  }),
  characters: z.array(scriptCharacterDraftSchema).default([]),
  episodes: z.array(scriptEpisodeDraftSchema).default([]),
  warnings: z.array(scriptImportWarningSchema).default([]),
});

export const confirmImportSchema = z.object({
  title: z.string().min(2, "Tên series tối thiểu 2 ký tự").optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug chỉ chứa chữ thường, số và gạch ngang").optional(),
  includeCharacters: z.boolean().default(true),
  selectedEpisodeNumbers: z.array(z.number().int()).optional(),
});

export const updateSeriesSchema = z.object({
  title: z.string().min(2).optional(),
  status: z.nativeEnum(SeriesStatus).optional(),
  styleGuide: z.any().optional(),
  safetyRules: z.any().optional(),
});

export const createCharacterSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhân vật"),
  role: z.string().min(1, "Vui lòng nhập vai trò"),
  ageDescription: z.string().optional(),
  appearanceLock: z.string().min(5, "Quy chuẩn ngoại hình tối thiểu 5 ký tự"),
  outfitLock: z.string().min(5, "Quy chuẩn trang phục tối thiểu 5 ký tự"),
  personality: z.string().optional(),
  voiceRule: z.string().min(3, "Quy tắc giọng/âm thanh không được để trống"),
  colorPalette: z.array(z.string()).optional(),
  masterPrompt: z.string().min(10, "Master prompt tối thiểu 10 ký tự"),
  negativePrompt: z.string().default(""),
  safetyRules: z.string().optional(),
  status: z.nativeEnum(CharacterStatus).default(CharacterStatus.DRAFT),
});

export const updateCharacterSchema = createCharacterSchema.partial();

export const attachReferenceAssetSchema = z.object({
  referenceType: z.nativeEnum(CharacterReferenceType),
  localPath: z.string().min(1, "Đường dẫn asset không được để trống"),
  mimeType: z.string(),
  approved: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

export const updateReferenceAssetSchema = z.object({
  approved: z.boolean(),
  metadata: z.record(z.any()).optional(),
});

export const updateEpisodeSchema = z.object({
  title: z.string().min(1).optional(),
  logline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  targetDurationSec: z.number().int().min(5).max(180).optional(),
  status: z.nativeEnum(EpisodeStatus).optional(),
});

export const updateSceneSchema = z.object({
  setting: z.string().optional(),
  action: z.string().min(1).optional(),
  dialogue: z.string().nullable().optional(),
  emotionDirection: z.string().nullable().optional(),
  soundDirection: z.string().nullable().optional(),
  visualPrompt: z.string().min(1).optional(),
  negativePrompt: z.string().optional(),
  continuityNotes: z.string().nullable().optional(),
  status: z.nativeEnum(SceneStatus).optional(),
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
  durationSec: z.number().min(0).optional(),
});

export const reorderScenesSchema = z.object({
  sceneIds: z.array(z.string().uuid("ID cảnh không hợp lệ")),
});

export const attachSceneAssetSchema = z.object({
  assetType: z.nativeEnum(AnimationAssetType),
  localPath: z.string().min(1, "Đường dẫn file không được trống"),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
  metadata: z.record(z.any()).optional(),
  approved: z.boolean().default(false),
});

export const updateSceneAssetSchema = z.object({
  approved: z.boolean(),
  metadata: z.record(z.any()).optional(),
});

export const renderEpisodeSchema = z.object({
  replaceNativeAudio: z.boolean().default(false),
  burnSubtitles: z.boolean().default(false),
  quality: z.enum(["high", "standard"]).default("high"),
});

export type ScriptSceneDraft = z.infer<typeof scriptSceneDraftSchema>;
export type ScriptDialogueDraft = z.infer<typeof scriptDialogueDraftSchema>;
export type ScriptEpisodeDraft = z.infer<typeof scriptEpisodeDraftSchema>;
export type ScriptCharacterDraft = z.infer<typeof scriptCharacterDraftSchema>;
export type ScriptImportWarning = z.infer<typeof scriptImportWarningSchema>;
export type ParsedScriptPayload = z.infer<typeof parsedScriptPayloadSchema>;
