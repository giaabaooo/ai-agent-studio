import { describe, it, expect } from "vitest";
import {
  createProductSchema,
  productAnalysisResponseSchema,
} from "@/lib/schemas/product.schema";

describe("Product Schema Validation", () => {
  it("should validate a correct product creation payload", () => {
    const validData = {
      name: "Máy Hút Bụi Mini Không Dây",
      category: "Automotive",
      url: "https://tiktok.com/@shop/sample",
      price: 189000,
      commissionRate: 15,
      description: "Máy hút bụi nhỏ gọn cầm tay cho xe hơi và bàn làm việc.",
      features: ["Lực hút 9000Pa", "Pin 30 phút"],
      verifiedClaims: ["Hút sạch bụi mịn"],
      imageUrls: ["products/img1.jpg", "products/img2.jpg", "products/img3.jpg"],
    };

    const parsed = createProductSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("should fail when name is too short", () => {
    const invalidData = {
      name: "A",
      category: "Tech",
      description: "Mô tả sản phẩm rất dài và chi tiết.",
      imageUrls: ["products/img1.jpg", "products/img2.jpg", "products/img3.jpg"],
    };

    const parsed = createProductSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it("should fail when no images are provided", () => {
    const invalidData = {
      name: "Sản phẩm test",
      category: "Home",
      description: "Mô tả sản phẩm rất dài và chi tiết.",
      imageUrls: [],
    };

    const parsed = createProductSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
