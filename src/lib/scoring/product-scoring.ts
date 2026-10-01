import { ProductAnalysisResponse } from "@/lib/schemas/product.schema";

export interface ScoreFactors {
  visualScore: number;
  accountFitScore: number;
  trendScore: number;
  commercialScore: number;
  overallScore: number;
}

/**
 * Computes deterministic scores for a product candidate based on its analysis and pricing attributes.
 * Scale: 0.0 - 10.0
 */
export function calculateProductScore(
  analysis: ProductAnalysisResponse,
  hasCommission: boolean,
  price?: number
): ScoreFactors {
  // Visual Demonstrability is 1-10
  const visualScore = analysis.visualDemonstrability;

  // Account Fit is 1-10
  const accountFitScore = analysis.accountFit;

  // Trend potential estimated from angles and risk level
  let trendScore = Math.min(
    10,
    5 + analysis.recommendedContentAngles.length * 0.8
  );
  if (analysis.riskLevel === "HIGH") {
    trendScore = Math.max(1, trendScore - 2.5);
  } else if (analysis.riskLevel === "LOW") {
    trendScore = Math.min(10, trendScore + 1.0);
  }

  // Commercial Score
  let commercialScore = 5.0;
  if (hasCommission) {
    commercialScore += 2.0;
  }
  if (price && price > 50000 && price < 500000) {
    // Sweet spot for impulse TikTok buy in Vietnam (50k - 500k VND)
    commercialScore += 2.0;
  } else if (price && price >= 500000) {
    commercialScore += 0.5;
  }
  commercialScore = Math.min(10, Math.max(1, commercialScore));

  // Weights for PRE-AFFILIATE Stage: Visual (35%), Account Fit (30%), Trend (25%), Commercial (10%)
  const overallScore =
    visualScore * 0.35 +
    accountFitScore * 0.3 +
    trendScore * 0.25 +
    commercialScore * 0.1;

  return {
    visualScore: Math.round(visualScore * 10) / 10,
    accountFitScore: Math.round(accountFitScore * 10) / 10,
    trendScore: Math.round(trendScore * 10) / 10,
    commercialScore: Math.round(commercialScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
  };
}
