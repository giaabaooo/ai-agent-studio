import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateReferenceAssetSchema } from "@/lib/schemas/animation.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateReferenceAssetSchema.parse(body);

    const updated = await animationService.updateReferenceAsset(
      id,
      validated.approved,
      validated.metadata
    );

    return NextResponse.json({ success: true, asset: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật trạng thái duyệt thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await animationService.deleteReferenceAsset(id);
    return NextResponse.json({ success: true, message: "Đã xóa ảnh tham chiếu" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Xóa ảnh tham chiếu thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
