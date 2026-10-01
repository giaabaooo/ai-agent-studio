import { z } from "zod";

export const timelineItemSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0.5),
  visual: z.string().min(3, "Mô tả hình ảnh không được để trống"),
  voice: z.string().min(1, "Lời thoại không được để trống"),
  overlay: z.string().optional().default(""),
});

export type TimelineItem = z.infer<typeof timelineItemSchema>;

export const creativeConceptSchema = z.object({
  hook: z.string().min(5, "Hook phải tối thiểu 5 ký tự"),
  hookType: z.enum([
    "PROBLEM_FIRST",
    "CURIOSITY",
    "BEFORE_AFTER",
    "SATISFYING_DEMO",
    "FAQ_OBJECTION",
  ]),
  angle: z.string().min(3, "Góc nội dung không được để trống"),
  creatorName: z.enum(["LINH", "NAM"]),
  durationSec: z.number().int().min(8).max(15).default(12),
  timeline: z
    .array(timelineItemSchema)
    .min(3, "Timeline phải có ít nhất 3 phân đoạn"),
  caption: z.string().min(5, "Caption phải tối thiểu 5 ký tự"),
  hashtags: z.array(z.string()).default([]),
  cta: z.string().min(3, "CTA không được để trống"),
  contentIntent: z.enum([
    "DISCOVERY",
    "EDUCATION",
    "ENTERTAINMENT",
    "SOFT_SELL",
    "HARD_SELL",
  ]),
});

export type CreativeConcept = z.infer<typeof creativeConceptSchema>;

export const generateCreativesResponseSchema = z.object({
  concepts: z
    .array(creativeConceptSchema)
    .length(3, "Yêu cầu chính xác 3 concepts kịch bản khác biệt"),
});

export type GenerateCreativesResponse = z.infer<
  typeof generateCreativesResponseSchema
>;

export const claimGuardResultSchema = z.object({
  status: z.enum(["PASS", "WARNING", "BLOCK"]),
  flaggedClaims: z.array(z.string()).default([]),
  reasons: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export type ClaimGuardResult = z.infer<typeof claimGuardResultSchema>;
