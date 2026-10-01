import { describe, it, expect } from "vitest";
import { calculateProductScore } from "@/lib/scoring/product-scoring";
import { ProductAnalysisResponse } from "@/lib/schemas/product.schema";

describe("Deterministic Product Scoring", () => {
  const mockAnalysis: ProductAnalysisResponse = {
    targetAudience: ["Tài xế ô tô", "Nhân viên văn phòng"],
    painPoints: ["Bụi bám khe ghế", "Vụn bánh rơi bàn phím"],
    purchaseMotivations: ["Nhỏ gọn", "Tiện lợi"],
    keyFeatures: ["9000Pa", "Type-C"],
    safeClaims: ["Hút sạch bụi"],
    riskClaims: [],
    recommendedCreator: "NAM",
    recommendedContentAngles: ["Thử hút khe ghế ô tô", "So sánh trước sau"],
    visualDemonstrability: 9,
    accountFit: 8,
    riskLevel: "LOW",
  };

  it("should calculate correct overall score for high demonstrability product", () => {
    const score = calculateProductScore(mockAnalysis, true, 199000);

    expect(score.visualScore).toBe(9);
    expect(score.accountFitScore).toBe(8);
    expect(score.overallScore).toBeGreaterThan(7.0);
    expect(score.overallScore).toBeLessThanOrEqual(10.0);
  });

  it("should penalize overall score when riskLevel is HIGH", () => {
    const highRiskAnalysis: ProductAnalysisResponse = {
      ...mockAnalysis,
      riskLevel: "HIGH",
    };

    const normalScore = calculateProductScore(mockAnalysis, true, 199000);
    const highRiskScore = calculateProductScore(highRiskAnalysis, true, 199000);

    expect(highRiskScore.trendScore).toBeLessThan(normalScore.trendScore);
    expect(highRiskScore.overallScore).toBeLessThan(normalScore.overallScore);
  });
});
