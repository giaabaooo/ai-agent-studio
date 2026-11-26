-- AlterTable
ALTER TABLE "publications" ADD COLUMN     "publishId" TEXT;

-- CreateTable
CREATE TABLE "tiktok_oauth_sessions" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiktok_oauth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_oauth_sessions_state_key" ON "tiktok_oauth_sessions"("state");

-- CreateIndex
CREATE INDEX "tiktok_oauth_sessions_state_idx" ON "tiktok_oauth_sessions"("state");
