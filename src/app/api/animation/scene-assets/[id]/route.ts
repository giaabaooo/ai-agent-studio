import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateSceneAssetSchema } from "@/lib/schemas/animation.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateSceneAssetSchema.parse(body);

    const updated = await animationService.updateSceneAsset(
      id,
      validated.approved,
      validated.metadata
    );

    return NextResponse.json({ success: true, asset: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật asset thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await animationService.deleteSceneAsset(id);
    return NextResponse.json({ success: true, message: "Đã xóa asset thành công" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Xóa asset thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
