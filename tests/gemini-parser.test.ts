import { describe, it, expect } from "vitest";
import { productAnalysisResponseSchema } from "@/lib/schemas/product.schema";
import { generateCreativesResponseSchema } from "@/lib/schemas/creative.schema";

describe("Gemini JSON Output Parser", () => {
  it("should parse and validate strict Product Analysis response", () => {
    const rawAiJson = {
      targetAudience: ["Tài xế công nghệ", "Chủ xe cá nhân"],
      painPoints: ["Xe bám bụi", "Khó vệ sinh góc hẹp"],
      purchaseMotivations: ["Nhỏ gọn", "Giá hợp lý"],
      keyFeatures: ["9000Pa", "Đầu hút chổi"],
      safeClaims: ["Dễ cất gọn"],
      riskClaims: [],
      recommendedCreator: "NAM",
      recommendedContentAngles: ["Demo khe ghế", "Test hút bụi laptop"],
      visualDemonstrability: 9,
      accountFit: 8,
      riskLevel: "LOW",
    };

    const validated = productAnalysisResponseSchema.parse(rawAiJson);
    expect(validated.recommendedCreator).toBe("NAM");
    expect(validated.visualDemonstrability).toBe(9);
  });

  it("should parse and validate strict 3 Creative concepts response", () => {
    const rawAiJson = {
      concepts: [
        {
          hook: "Khe ghế ô tô bạn có đang bẩn thế này không?",
          hookType: "PROBLEM_FIRST",
          angle: "Thực tế xe hơi",
          creatorName: "NAM",
          durationSec: 12,
          timeline: [
            { start: 0, end: 2, visual: "Cận cảnh", voice: "Bụi bám đầy", overlay: "Bẩn?" },
            { start: 2, end: 7, visual: "Hút bụi", voice: "Thử con mini này", overlay: "Hút" },
            { start: 7, end: 12, visual: "Sạch sẽ", voice: "Sạch bóng", overlay: "Xong" },
          ],
          caption: "Mẹo nhỏ cho xe hơi",
          hashtags: ["#xe", "#dohay"],
          cta: "Xem ngay nhé",
          contentIntent: "DISCOVERY",
        },
        {
          hook: "Đừng vội mua máy hút bụi to cồng kềnh",
          hookType: "CURIOSITY",
          angle: "So sánh tiện lợi",
          creatorName: "NAM",
          durationSec: 12,
          timeline: [
            { start: 0, end: 2, visual: "Cầm máy nhỏ", voice: "Xem con này nè", overlay: "Bất ngờ" },
            { start: 2, end: 7, visual: "Test lực hút", voice: "Hút cực mạnh", overlay: "9000Pa" },
            { start: 7, end: 12, visual: "Cất hộc xe", voice: "Vừa in hộc xe", overlay: "Gọn gàng" },
          ],
          caption: "Nhỏ mà có võ",
          hashtags: ["#tienich"],
          cta: "Chi tiết ở góc trái",
          contentIntent: "EDUCATION",
        },
        {
          hook: "Trước và sau khi vệ sinh bàn phím máy tính",
          hookType: "BEFORE_AFTER",
          angle: "Góc làm việc",
          creatorName: "NAM",
          durationSec: 12,
          timeline: [
            { start: 0, end: 2, visual: "Bàn phím bẩn", voice: "Bàn phím đầy vụn bánh", overlay: "Trước" },
            { start: 2, end: 7, visual: "Đầu chổi quét", voice: "Quét một đường là sạch", overlay: "Đang hút" },
            { start: 7, end: 12, visual: "Bàn phím mới", voice: "Như mới luôn", overlay: "Sau" },
          ],
          caption: "Bàn làm việc sạch bóng",
          hashtags: ["#desksetup"],
          cta: "Thử ngay nhé",
          contentIntent: "SOFT_SELL",
        },
      ],
    };

    const validated = generateCreativesResponseSchema.parse(rawAiJson);
    expect(validated.concepts.length).toBe(3);
    expect(validated.concepts[0].hookType).toBe("PROBLEM_FIRST");
  });
});
