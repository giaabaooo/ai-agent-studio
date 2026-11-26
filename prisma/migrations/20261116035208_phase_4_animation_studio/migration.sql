-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EpisodeParseStatus" AS ENUM ('PARSED', 'NEEDS_REVIEW', 'ERROR');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'STORYBOARD_READY', 'ASSETS_PENDING', 'VOICE_READY', 'RENDERED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CharacterReferenceType" AS ENUM ('FULL_BODY_FRONT', 'FULL_BODY_THREE_QUARTER', 'FULL_BODY_BACK', 'EXPRESSION', 'BASIC_POSE', 'GROUP_HEIGHT_SHEET');

-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('DRAFT', 'PROMPT_READY', 'ASSETS_PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "AnimationAssetType" AS ENUM ('KEYFRAME', 'RAW_VIDEO', 'VOICE', 'SFX', 'MUSIC');

-- CreateEnum
CREATE TYPE "RenderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScriptImportStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DISCARDED');

-- CreateTable
CREATE TABLE "animation_series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceDocPath" TEXT,
    "sourceDocHash" TEXT,
    "status" "SeriesStatus" NOT NULL DEFAULT 'DRAFT',
    "styleGuide" JSONB,
    "safetyRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animation_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animation_seasons" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animation_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animation_episodes" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT,
    "summary" TEXT,
    "targetDurationSec" INTEGER NOT NULL DEFAULT 50,
    "sourceContent" TEXT,
    "parseStatus" "EpisodeParseStatus" NOT NULL DEFAULT 'PARSED',
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animation_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animation_characters" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ageDescription" TEXT,
    "appearanceLock" TEXT NOT NULL,
    "outfitLock" TEXT NOT NULL,
    "personality" TEXT,
    "voiceRule" TEXT NOT NULL,
    "colorPalette" JSONB,
    "masterPrompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "safetyRules" TEXT,
    "status" "CharacterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animation_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_reference_assets" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "referenceType" "CharacterReferenceType" NOT NULL,
    "localPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_reference_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_scenes" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "setting" TEXT NOT NULL DEFAULT 'Ngôi nhà Nắng',
    "action" TEXT NOT NULL,
    "dialogue" TEXT,
    "emotionDirection" TEXT,
    "soundDirection" TEXT,
    "visualPrompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "continuityNotes" TEXT,
    "status" "SceneStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episode_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_assets" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "assetType" "AnimationAssetType" NOT NULL,
    "localPath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_renders" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "RenderStatus" NOT NULL DEFAULT 'PENDING',
    "renderOptions" JSONB,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episode_renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_import_drafts" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT,
    "sourcePath" TEXT NOT NULL,
    "sourceDocHash" TEXT,
    "parsedJson" JSONB NOT NULL,
    "warnings" JSONB,
    "status" "ScriptImportStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_import_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "animation_series_slug_key" ON "animation_series"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "animation_seasons_seriesId_number_key" ON "animation_seasons"("seriesId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "animation_episodes_seasonId_number_key" ON "animation_episodes"("seasonId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "animation_characters_seriesId_name_key" ON "animation_characters"("seriesId", "name");

-- CreateIndex
CREATE INDEX "character_reference_assets_characterId_referenceType_idx" ON "character_reference_assets"("characterId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "episode_scenes_episodeId_orderIndex_key" ON "episode_scenes"("episodeId", "orderIndex");

-- CreateIndex
CREATE INDEX "scene_assets_sceneId_assetType_idx" ON "scene_assets"("sceneId", "assetType");

-- CreateIndex
CREATE INDEX "episode_renders_episodeId_version_idx" ON "episode_renders"("episodeId", "version");

-- CreateIndex
CREATE INDEX "script_import_drafts_status_createdAt_idx" ON "script_import_drafts"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "animation_seasons" ADD CONSTRAINT "animation_seasons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "animation_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animation_episodes" ADD CONSTRAINT "animation_episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "animation_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animation_characters" ADD CONSTRAINT "animation_characters_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "animation_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_reference_assets" ADD CONSTRAINT "character_reference_assets_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "animation_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_scenes" ADD CONSTRAINT "episode_scenes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "animation_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_assets" ADD CONSTRAINT "scene_assets_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "episode_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_renders" ADD CONSTRAINT "episode_renders_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "animation_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_import_drafts" ADD CONSTRAINT "script_import_drafts_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "animation_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
