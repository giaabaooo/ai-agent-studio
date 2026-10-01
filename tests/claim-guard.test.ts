import { describe, it, expect } from "vitest";
import { evaluateClaimGuard } from "@/modules/creatives/claim-guard";
import { CreativeConcept } from "@/lib/schemas/creative.schema";

describe("Claim Guard Rule & Safety Engine", () => {
  const baseConcept: CreativeConcept = {
    hook: "Xe bạn có đang đầy bụi bẩn thế này không?",
    hookType: "PROBLEM_FIRST",
    angle: "Demo thực tế",
    creatorName: "NAM",
    durationSec: 12,
    timeline: [
      { start: 0, end: 2, visual: "Cận cảnh khe ghế", voice: "Xem khe ghế này này", overlay: "Bụi bẩn?" },
      { start: 2, end: 7, visual: "Hút bụi", voice: "Dùng con mini này hút thử", overlay: "Hút sạch" },
      { start: 7, end: 10, visual: "Kết quả sạch", voice: "Sạch bóng luôn", overlay: "Xong!" },
      { start: 10, end: 12, visual: "Cầm sản phẩm", voice: "Bấm góc trái nhé", overlay: "Giỏ hàng" },
    ],
    caption: "Mẹo vệ sinh khe ghế xe hơi cực nhanh",
    hashtags: ["#xehoi", "#dohay"],
    cta: "Bấm góc trái xem chi tiết",
    contentIntent: "DISCOVERY",
  };

  it("should PASS clean and compliant concepts", () => {
    const result = evaluateClaimGuard(baseConcept, ["Lực hút mạnh"]);
    expect(result.status).toBe("PASS");
    expect(result.flaggedClaims.length).toBe(0);
  });

  it("should BLOCK concepts with severe medical or guaranteed claims", () => {
    const badConcept: CreativeConcept = {
      ...baseConcept,
      hook: "Sản phẩm này cam kết 100% chữa khỏi đau lưng cho tài xế",
    };

    const result = evaluateClaimGuard(badConcept, []);
    expect(result.status).toBe("BLOCK");
    expect(result.flaggedClaims).toContain("cam kết 100%");
  });

  it("should trigger WARNING for unsupported superlative claims", () => {
    const warningConcept: CreativeConcept = {
      ...baseConcept,
      caption: "Đây là máy hút bụi tốt nhất thị trường hiện nay",
    };

    const result = evaluateClaimGuard(warningConcept, []);
    expect(result.status).toBe("WARNING");
    expect(result.flaggedClaims).toContain("tốt nhất thị trường");
  });
});
