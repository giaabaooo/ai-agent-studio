import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Tên sản phẩm tối thiểu 2 ký tự"),
  category: z.string().min(2, "Danh mục không được để trống"),
  url: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  price: z.coerce.number().positive("Giá phải lớn hơn 0").optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  description: z.string().min(10, "Mô tả sản phẩm tối thiểu 10 ký tự"),
  features: z.array(z.string()).default([]),
  verifiedClaims: z.array(z.string()).default([]),
  sellerInfo: z.string().optional().or(z.literal("")),
  imageUrls: z
    .array(z.string())
    .min(1, "Cần tối thiểu 1 ảnh sản phẩm")
    .max(8, "Tối đa 8 ảnh sản phẩm"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const productAnalysisResponseSchema = z.object({
  targetAudience: z.array(z.string()).min(1, "Cần ít nhất 1 tệp khán giả mục tiêu"),
  painPoints: z.array(z.string()).min(1, "Cần ít nhất 1 nỗi đau khách hàng"),
  purchaseMotivations: z.array(z.string()).min(1, "Cần ít nhất 1 động lực mua"),
  keyFeatures: z.array(z.string()).min(1, "Cần ít nhất 1 tính năng chính"),
  safeClaims: z.array(z.string()).default([]),
  riskClaims: z.array(z.string()).default([]),
  recommendedCreator: z.enum(["LINH", "NAM", "BOTH"]),
  recommendedContentAngles: z
    .array(z.string())
    .min(2, "Cần ít nhất 2 góc nội dung được gợi ý"),
  visualDemonstrability: z.number().int().min(1).max(10),
  accountFit: z.number().int().min(1).max(10),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export type ProductAnalysisResponse = z.infer<
  typeof productAnalysisResponseSchema
>;
