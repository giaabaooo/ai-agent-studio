import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { confirmImportSchema } from "@/lib/schemas/animation.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is allowed
    }

    const validated = confirmImportSchema.parse(body);
    const result = await animationService.confirmImportDraft(id, validated);

    return NextResponse.json({
      success: true,
      message: "Xác nhận import kịch bản thành công",
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Xác nhận import thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
