import { ProductAnalysisResponse } from "@/lib/schemas/product.schema";
import { GenerateCreativesResponse } from "@/lib/schemas/creative.schema";

export interface AnalyzeProductInput {
  name: string;
  category: string;
  description: string;
  features: string[];
  verifiedClaims: string[];
  price?: number;
}

export interface GenerateCreativesInput {
  productName: string;
  category: string;
  description: string;
  features: string[];
  verifiedClaims: string[];
  analysis: ProductAnalysisResponse;
  creatorName: "LINH" | "NAM";
  creatorStyle: string;
}

export interface AIProvider {
  analyzeProduct(input: AnalyzeProductInput): Promise<ProductAnalysisResponse>;
  generateCreatives(input: GenerateCreativesInput): Promise<GenerateCreativesResponse>;
}
