import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const draft = await animationService.getImportDraft(id);
    return NextResponse.json({ success: true, draft });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không tìm thấy bản nháp";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await animationService.updateImportDraft(id, body);
    return NextResponse.json({ success: true, draft: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật bản nháp thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await animationService.discardImportDraft(id);
    return NextResponse.json({ success: true, message: "Đã hủy bản nháp" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Hủy bản nháp thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
