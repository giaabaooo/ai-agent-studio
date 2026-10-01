import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import {
  AIProvider,
  AnalyzeProductInput,
  GenerateCreativesInput,
} from "./ai-provider.interface";
import {
  ProductAnalysisResponse,
  productAnalysisResponseSchema,
} from "@/lib/schemas/product.schema";
import {
  GenerateCreativesResponse,
  generateCreativesResponseSchema,
} from "@/lib/schemas/creative.schema";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | null = null;
  private modelName: string;

  constructor() {
    this.modelName = env.GEMINI_MODEL || "gemini-3.8-flash";
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== "") {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  private ensureClient(): GoogleGenAI {
    if (!this.client) {
      throw new Error(
        "GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env.local để sử dụng tính năng AI."
      );
    }
    return this.client;
  }

  private async logUsage(
    taskType: string,
    usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
    success: boolean,
    errorMessage?: string
  ) {
    try {
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;
      // In FREE_ONLY mode, estimated cost is 0.0
      await prisma.aiUsage.create({
        data: {
          provider: "GEMINI",
          model: this.modelName,
          taskType,
          inputTokens,
          outputTokens,
          estimatedCost: 0.0,
          success,
          errorMessage,
        },
      });
    } catch (logErr) {
      console.warn("Could not log AI usage:", logErr);
    }
  }

  async analyzeProduct(
    input: AnalyzeProductInput
  ): Promise<ProductAnalysisResponse> {
    const ai = this.ensureClient();
    const prompt = `
Bạn là Giám đốc Nghiên cứu Sản phẩm & Chuyên gia Phân tích TikTok Affiliate (Affiliate AI Studio).
Hãy phân tích sản phẩm sau đây và trả về STRICT JSON tuân thủ đúng cấu trúc schema:

Thông tin sản phẩm:
- Tên: ${input.name}
- Danh mục: ${input.category}
- Mô tả: ${input.description}
- Tính năng: ${input.features.join(", ")}
- Verified Claims (Tuyên bố được xác thực): ${input.verifiedClaims.join(", ")}
- Giá: ${input.price ? input.price + " VND" : "Chưa rõ"}

Yêu cầu xuất ra JSON chuẩn (không bọc trong markdown code block, chỉ trả về JSON thô):
{
  "targetAudience": ["Tệp khán giả cụ thể trên TikTok"],
  "painPoints": ["Nỗi đau/vấn đề thực tế mà sản phẩm giải quyết"],
  "purchaseMotivations": ["Động lực thúc đẩy quyết định mua ngay"],
  "keyFeatures": ["Tính năng nổi bật trực quan nhất"],
  "safeClaims": ["Tuyên bố an toàn, trung thực, có thể kiểm chứng"],
  "riskClaims": ["Tuyên bố rủi ro cần tránh/nói giảm nói tránh"],
  "recommendedCreator": "LINH" | "NAM" | "BOTH",
  "recommendedContentAngles": ["Ít nhất 2 góc quay/cách tiếp cận nội dung hấp dẫn"],
  "visualDemonstrability": (số nguyên từ 1 đến 10, đo mức độ dễ demo trực quan trước ống kính),
  "accountFit": (số nguyên từ 1 đến 10, đo độ hợp với kênh Đồ Hay Tiện Ích),
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}
`;

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsedJson = JSON.parse(responseText);
      const validated = productAnalysisResponseSchema.parse(parsedJson);

      await this.logUsage(
        "PRODUCT_ANALYSIS",
        response.usageMetadata,
        true
      );

      return validated;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.logUsage("PRODUCT_ANALYSIS", undefined, false, errorMsg);
      throw new Error(`Gemini Product Analysis thất bại: ${errorMsg}`);
    }
  }

  async generateCreatives(
    input: GenerateCreativesInput
  ): Promise<GenerateCreativesResponse> {
    const ai = this.ensureClient();
    const prompt = `
Bạn là Creative Director cho kênh TikTok Affiliate AI Studio.
Creator thực hiện kịch bản: ${input.creatorName}
Phong cách Creator: ${input.creatorStyle}

Sản phẩm:
- Tên: ${input.productName}
- Danh mục: ${input.category}
- Mô tả: ${input.description}
- Tính năng chính: ${input.features.join(", ")}
- Điểm mạnh trực quan: ${input.analysis.visualDemonstrability}/10
- Góc nội dung gợi ý: ${input.analysis.recommendedContentAngles.join("; ")}

Hãy tạo chính xác 3 concept kịch bản video ngắn (10-12 giây) riêng biệt với 3 hook format khác nhau (ví dụ: Problem-first, Curiosity, Before-After).
Kịch bản phải tối ưu cho UGC TikTok thực tế, giữ tone tự nhiên, không đọc như quảng cáo truyền hình.
Chia timeline cụ thể từng giây (0-2s hook, 2-7s demo trực quan, 7-10s kết quả, 10-12s CTA).

Trả về STRICT JSON theo cấu trúc sau (không bọc trong markdown code block, chỉ trả về JSON thô):
{
  "concepts": [
    {
      "hook": "Câu mở đầu giật hook 2 giây đầu",
      "hookType": "PROBLEM_FIRST" | "CURIOSITY" | "BEFORE_AFTER" | "SATISFYING_DEMO" | "FAQ_OBJECTION",
      "angle": "Góc khai thác kịch bản",
      "creatorName": "${input.creatorName}",
      "durationSec": 12,
      "timeline": [
        {
          "start": 0,
          "end": 2,
          "visual": "Mô tả hình ảnh shot 1",
          "voice": "Lời thoại ngắn gọn",
          "overlay": "Chữ hiển thị trên màn hình"
        },
        {
          "start": 2,
          "end": 7,
          "visual": "Mô tả demo sử dụng sản phẩm",
          "voice": "Lời thoại tự nhiên",
          "overlay": "Từ khóa nhấn mạnh"
        },
        {
          "start": 7,
          "end": 10,
          "visual": "Mô tả kết quả đạt được",
          "voice": "Cảm nhận chân thực",
          "overlay": "Kết quả"
        },
        {
          "start": 10,
          "end": 12,
          "visual": "Creator cầm sản phẩm kêu gọi hành động",
          "voice": "CTA tự nhiên",
          "overlay": "Link ở giỏ hàng"
        }
      ],
      "caption": "Caption TikTok hấp dẫn kèm hashtag",
      "hashtags": ["#dohay", "#tienich", "#review"],
      "cta": "Kêu gọi hành động ngắn gọn",
      "contentIntent": "DISCOVERY" | "EDUCATION" | "ENTERTAINMENT" | "SOFT_SELL" | "HARD_SELL"
    }
  ]
}
`;

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsedJson = JSON.parse(responseText);
      const validated = generateCreativesResponseSchema.parse(parsedJson);

      await this.logUsage(
        "CREATIVE_GENERATION",
        response.usageMetadata,
        true
      );

      return validated;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.logUsage("CREATIVE_GENERATION", undefined, false, errorMsg);
      throw new Error(`Gemini Creative Generation thất bại: ${errorMsg}`);
    }
  }
}

export const geminiProvider = new GeminiProvider();
