import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_MODE: z.enum(["local", "cloud"]).default("local"),
  FREE_ONLY: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, "TOKEN_ENCRYPTION_KEY must be at least 32 chars"),
  TIKTOK_CLIENT_KEY: z.string().optional().default(""),
  TIKTOK_CLIENT_SECRET: z.string().optional().default(""),
  TIKTOK_REDIRECT_URI: z.string().optional().default("http://localhost:3000/api/tiktok/callback"),
  TIKTOK_DRAFT_UPLOAD_ENABLED: z.string().transform((val) => val === "true").default("false"),
  MEDIA_ROOT: z.string().default("./media"),
  MACHINE_LABEL: z.string().default("MAC_OFFICE"),
  // Resolve `ffmpeg` through PATH by default. A workstation can override this
  // locally without committing an OS-specific path.
  FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
  VOICE_PROVIDER: z.enum(["MACOS_SAY", "EXTERNAL"]).default("MACOS_SAY"),
  FAL_KEY: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_URL: z.string().optional().default(""),
  CLOUDINARY_DEFAULT_FOLDER: z.string().optional().default("tiktok-video"),
});

export const env = envSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres@127.0.0.1:5433/affiliate_ai_studio",
  APP_MODE: process.env.APP_MODE || "local",
  FREE_ONLY: process.env.FREE_ONLY || "true",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  SESSION_SECRET:
    process.env.SESSION_SECRET ||
    "default-session-secret-change-in-production-min-16-chars",
  TOKEN_ENCRYPTION_KEY:
    process.env.TOKEN_ENCRYPTION_KEY ||
    "01234567890123456789012345678901",
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY || "",
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET || "",
  TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,
  TIKTOK_DRAFT_UPLOAD_ENABLED: process.env.TIKTOK_DRAFT_UPLOAD_ENABLED || "false",
  MEDIA_ROOT: process.env.MEDIA_ROOT || "./media",
  MACHINE_LABEL: process.env.MACHINE_LABEL || "MAC_OFFICE",
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  VOICE_PROVIDER: process.env.VOICE_PROVIDER || "MACOS_SAY",
  FAL_KEY: process.env.FAL_KEY || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "dcadn2syh",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "178359369335534",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "FwsPdInccg7HPp6iLNn9ewxDJe4",
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || "",
  CLOUDINARY_DEFAULT_FOLDER: process.env.CLOUDINARY_DEFAULT_FOLDER || "tiktok-video",
});
