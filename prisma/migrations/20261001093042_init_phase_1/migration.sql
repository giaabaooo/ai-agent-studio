-- CreateEnum
CREATE TYPE "AccountStage" AS ENUM ('NEW', 'GROWING', 'PRE_AFFILIATE', 'AFFILIATE_ACTIVE', 'SCALING');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "ReferenceImageType" AS ENUM ('MASTER_FACE', 'FRONT', 'THREE_QUARTER', 'SIDE', 'FULL_BODY', 'SITTING', 'STANDING', 'HOLDING_OBJECT', 'EXPRESSION', 'OUTFIT');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('CANDIDATE', 'TESTING', 'WINNER', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ContentIntent" AS ENUM ('DISCOVERY', 'EDUCATION', 'ENTERTAINMENT', 'SOFT_SELL', 'HARD_SELL');

-- CreateEnum
CREATE TYPE "ClaimGuardStatus" AS ENUM ('PASS', 'WARNING', 'BLOCK');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'CONCEPT_APPROVED', 'PROMPT_READY', 'IMAGE_UPLOADED', 'VIDEO_UPLOADED', 'VOICE_GENERATED', 'FINAL_RENDERED', 'READY_TO_POST', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('IMAGE_MODEL_PRODUCT', 'IMAGE_THUMBNAIL', 'VIDEO_VEO_GEMINI');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('GENERATED_IMAGE', 'THUMBNAIL', 'RAW_VIDEO', 'VOICE_AUDIO', 'FINAL_VIDEO');

-- CreateEnum
CREATE TYPE "ContentPlanStatus" AS ENUM ('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('PROPOSED', 'APPROVED', 'IMAGE_PENDING', 'VIDEO_PENDING', 'POST_PROCESSING', 'READY', 'DRAFT_UPLOADED', 'PUBLISHED', 'ANALYZING');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CONCLUDED');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('CANDIDATE', 'ACTIVE', 'WEAKENING', 'RETIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(10,4) NOT NULL DEFAULT 0.0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "openId" TEXT NOT NULL,
    "unionId" TEXT,
    "stage" "AccountStage" NOT NULL DEFAULT 'NEW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_oauth_tokens" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_snapshots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL,
    "likesCount" INTEGER NOT NULL,
    "videoCount" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_stage_history" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fromStage" "AccountStage" NOT NULL,
    "toStage" "AccountStage" NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_creators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageStyle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "masterAppearancePrompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_reference_images" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "ReferenceImageType" NOT NULL,
    "localPath" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_reference_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_voice_profiles" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVoiceId" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "speakingRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "energy" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT,
    "price" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "description" TEXT NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sellerInfo" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'CANDIDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "targetAudience" TEXT[],
    "painPoints" TEXT[],
    "purchaseMotivations" TEXT[],
    "keyFeatures" TEXT[],
    "safeClaims" TEXT[],
    "riskClaims" TEXT[],
    "recommendedCreator" TEXT NOT NULL,
    "recommendedContentAngles" TEXT[],
    "visualDemonstrability" INTEGER NOT NULL,
    "accountFit" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "rawAiResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_scores" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visualScore" DOUBLE PRECISION NOT NULL,
    "accountFitScore" DOUBLE PRECISION NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL,
    "commercialScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_score_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "factors" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_candidates" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "shortlistedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerAction" TEXT,

    CONSTRAINT "product_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "productId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "hookType" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 12,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta" TEXT NOT NULL,
    "contentIntent" "ContentIntent" NOT NULL DEFAULT 'DISCOVERY',
    "claimGuardStatus" "ClaimGuardStatus" NOT NULL DEFAULT 'PASS',
    "claimGuardReport" JSONB,
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_timelines" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "visualDesc" TEXT NOT NULL,
    "voiceText" TEXT NOT NULL,
    "overlayText" TEXT,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "creative_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_versions" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "type" "PromptType" NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "localPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_versions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_plans" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "accountStage" "AccountStage" NOT NULL,
    "strategyVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "ContentPlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "creativeId" TEXT,
    "category" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "experimentId" TEXT,
    "status" "PlanItemStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "tikTokVideoId" TEXT,
    "tikTokShareUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_creative_dna" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hookType" TEXT NOT NULL,
    "hookText" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "voiceProfile" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "captionStyle" TEXT NOT NULL,
    "hashtagGroup" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postedSlot" TEXT NOT NULL,

    CONSTRAINT "publication_creative_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_metric_snapshots" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "likeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "commentRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "shareRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "viewVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_metric_snapshots" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "productClicks" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "confirmedOrders" INTEGER NOT NULL DEFAULT 0,
    "gmv" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "primaryMetric" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_variants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "params" JSONB NOT NULL,

    CONSTRAINT "experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_results" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "resultSummary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_rules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "supportingCreativeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'CANDIDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "observations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hypotheses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creatorInsights" JSONB NOT NULL,
    "categoryInsights" JSONB NOT NULL,
    "hookInsights" JSONB NOT NULL,
    "postingTimeInsights" JSONB NOT NULL,
    "productsToScale" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productsToPause" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedExperiments" JSONB NOT NULL,
    "tomorrowAllocation" JSONB NOT NULL,
    "rawAiReport" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_decisions" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT,
    "decisionType" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "implemented" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ai_usage_taskType_createdAt_idx" ON "ai_usage"("taskType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_accounts_username_key" ON "tiktok_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_accounts_openId_key" ON "tiktok_accounts"("openId");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_oauth_tokens_accountId_key" ON "tiktok_oauth_tokens"("accountId");

-- CreateIndex
CREATE INDEX "account_snapshots_accountId_capturedAt_idx" ON "account_snapshots"("accountId", "capturedAt");

-- CreateIndex
CREATE INDEX "account_stage_history_accountId_changedAt_idx" ON "account_stage_history"("accountId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_creators_name_key" ON "virtual_creators"("name");

-- CreateIndex
CREATE INDEX "creator_reference_images_creatorId_type_idx" ON "creator_reference_images"("creatorId", "type");

-- CreateIndex
CREATE INDEX "products_category_status_idx" ON "products"("category", "status");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_analyses_productId_version_idx" ON "product_analyses"("productId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "product_scores_productId_key" ON "product_scores"("productId");

-- CreateIndex
CREATE INDEX "product_score_history_productId_recordedAt_idx" ON "product_score_history"("productId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_candidates_productId_key" ON "product_candidates"("productId");

-- CreateIndex
CREATE INDEX "creatives_productId_creatorId_status_idx" ON "creatives"("productId", "creatorId", "status");

-- CreateIndex
CREATE INDEX "creative_timelines_creativeId_orderIndex_idx" ON "creative_timelines"("creativeId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "creative_versions_creativeId_version_key" ON "creative_versions"("creativeId", "version");

-- CreateIndex
CREATE INDEX "prompts_creativeId_type_idx" ON "prompts"("creativeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_promptId_version_key" ON "prompt_versions"("promptId", "version");

-- CreateIndex
CREATE INDEX "assets_creativeId_type_idx" ON "assets"("creativeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "asset_versions_assetId_version_key" ON "asset_versions"("assetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "content_plans_date_key" ON "content_plans"("date");

-- CreateIndex
CREATE INDEX "content_plan_items_planId_plannedAt_status_idx" ON "content_plan_items"("planId", "plannedAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "publications_creativeId_key" ON "publications"("creativeId");

-- CreateIndex
CREATE UNIQUE INDEX "publications_tikTokVideoId_key" ON "publications"("tikTokVideoId");

-- CreateIndex
CREATE INDEX "publications_accountId_postedAt_idx" ON "publications"("accountId", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "publication_creative_dna_publicationId_key" ON "publication_creative_dna"("publicationId");

-- CreateIndex
CREATE INDEX "publication_creative_dna_creatorId_category_hookType_idx" ON "publication_creative_dna"("creatorId", "category", "hookType");

-- CreateIndex
CREATE INDEX "video_metric_snapshots_publicationId_capturedAt_idx" ON "video_metric_snapshots"("publicationId", "capturedAt");

-- CreateIndex
CREATE INDEX "affiliate_metric_snapshots_publicationId_capturedAt_idx" ON "affiliate_metric_snapshots"("publicationId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_results_experimentId_key" ON "experiment_results"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_reportDate_key" ON "daily_reports"("reportDate");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiktok_oauth_tokens" ADD CONSTRAINT "tiktok_oauth_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tiktok_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tiktok_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_stage_history" ADD CONSTRAINT "account_stage_history_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tiktok_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_reference_images" ADD CONSTRAINT "creator_reference_images_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "virtual_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_voice_profiles" ADD CONSTRAINT "creator_voice_profiles_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "virtual_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_scores" ADD CONSTRAINT "product_scores_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_score_history" ADD CONSTRAINT "product_score_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_candidates" ADD CONSTRAINT "product_candidates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "virtual_creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_timelines" ADD CONSTRAINT "creative_timelines_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_versions" ADD CONSTRAINT "creative_versions_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "content_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "virtual_creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "tiktok_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_creative_dna" ADD CONSTRAINT "publication_creative_dna_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_metric_snapshots" ADD CONSTRAINT "video_metric_snapshots_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_metric_snapshots" ADD CONSTRAINT "affiliate_metric_snapshots_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_decisions" ADD CONSTRAINT "strategy_decisions_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "daily_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
