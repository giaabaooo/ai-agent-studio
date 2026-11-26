import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateSceneSchema } from "@/lib/schemas/animation.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateSceneSchema.parse(body);
    const updated = await animationService.updateScene(id, validated);
    return NextResponse.json({ success: true, scene: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật cảnh thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
