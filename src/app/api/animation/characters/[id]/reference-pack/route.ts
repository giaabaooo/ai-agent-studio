import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const character = await animationService.getCharacter(id);

    const packText = [
      `=== REFERENCE PACK: ${character.name.toUpperCase()} ===`,
      `Vai trò: ${character.role}`,
      `Độ tuổi: ${character.ageDescription || "N/A"}`,
      `Nhận diện ngoại hình: ${character.appearanceLock}`,
      `Trang phục cố định: ${character.outfitLock}`,
      `Quy tắc giọng / âm thanh: ${character.voiceRule}`,
      ``,
      `--- MASTER PROMPT ---`,
      character.masterPrompt,
      ``,
      `--- NEGATIVE PROMPT ---`,
      character.negativePrompt,
      ``,
      `--- CHECKLIST ẢNH THAM CHIẾU ---`,
      `Đã duyệt: ${character.checklist.approvedCount} / ${character.checklist.totalCount}`,
      character.checklist.missingRequiredTypes.length > 0
        ? `Góc ảnh còn thiếu: ${character.checklist.missingRequiredTypes.join(", ")}`
        : `Checklist đầy đủ 100%! Đã sẵn sàng cho tạo video.`,
    ].join("\n");

    return NextResponse.json({
      success: true,
      character,
      packText,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tải Reference Pack thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
