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
  MEDIA_ROOT: z.string().default("./media"),
  MACHINE_LABEL: z.string().default("MAC_OFFICE"),
  FFMPEG_PATH: z.string().default("/Users/na/.local/bin/ffmpeg"),
  VOICE_PROVIDER: z.enum(["MACOS_SAY", "EDGE_TTS"]).default("MACOS_SAY"),
});

export const env = envSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres@localhost:5433/affiliate_ai_studio",
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
  MEDIA_ROOT: process.env.MEDIA_ROOT || "./media",
  MACHINE_LABEL: process.env.MACHINE_LABEL || "MAC_OFFICE",
  FFMPEG_PATH: process.env.FFMPEG_PATH || "/Users/na/.local/bin/ffmpeg",
  VOICE_PROVIDER: process.env.VOICE_PROVIDER || "MACOS_SAY",
});
