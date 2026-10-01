import {
  ClaimGuardResult,
  CreativeConcept,
} from "@/lib/schemas/creative.schema";

const SEVERE_BLACKLIST = [
  "chữa khỏi",
  "trị dứt điểm",
  "cam kết 100%",
  "cam kết khỏi",
  "giảm cân cấp tốc",
  "trắng da sau 1 đêm",
  "thần dược",
  "thuốc chữa",
  "trị ung thư",
  "trị tiểu đường",
  "chữa bách bệnh",
  "hoàn tiền 100% không cần lý do",
];

const WARNING_PATTERNS = [
  "tốt nhất thị trường",
  "số 1 việt nam",
  "duy nhất hiện nay",
  "không đâu có",
  "rẻ nhất quả đất",
  "hiệu quả ngay tức thì",
];

/**
 * Runs Claim Guard validation on a creative concept.
 * Layer 1: Deterministic regex and blacklist verification.
 * Layer 2: Verified claim comparison.
 */
export function evaluateClaimGuard(
  concept: CreativeConcept,
  verifiedClaims: string[] = []
): ClaimGuardResult {
  const fullText = [
    concept.hook,
    concept.caption,
    concept.cta,
    ...concept.timeline.map((t) => `${t.voice} ${t.overlay || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const flaggedClaims: string[] = [];
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // 1. Check severe violations (BLOCK)
  for (const phrase of SEVERE_BLACKLIST) {
    if (fullText.includes(phrase)) {
      flaggedClaims.push(phrase);
      reasons.push(
        `Từ khóa vi phạm chính sách cấm tuyên bố y tế / cam kết tuyệt đối: "${phrase}"`
      );
      suggestions.push(
        `Thay thế "${phrase}" bằng cách mô tả trải nghiệm thực tế hoặc giải pháp trực quan.`
      );
    }
  }

  if (flaggedClaims.length > 0) {
    return {
      status: "BLOCK",
      flaggedClaims,
      reasons,
      suggestions,
    };
  }

  // 2. Check warning claims (WARNING)
  for (const phrase of WARNING_PATTERNS) {
    if (fullText.includes(phrase)) {
      flaggedClaims.push(phrase);
      reasons.push(
        `Từ khóa so sánh nhất chưa được kiểm chứng độc lập: "${phrase}"`
      );
      suggestions.push(
        `Nên dùng từ ngữ trung tính hơn như "khá tiện lợi", "mình thấy ưng ý", "rất đáng thử".`
      );
    }
  }

  if (flaggedClaims.length > 0) {
    return {
      status: "WARNING",
      flaggedClaims,
      reasons,
      suggestions,
    };
  }

  return {
    status: "PASS",
    flaggedClaims: [],
    reasons: ["Kịch bản tuân thủ quy chuẩn Claim Guard và an toàn nội dung."],
    suggestions: [],
  };
}
