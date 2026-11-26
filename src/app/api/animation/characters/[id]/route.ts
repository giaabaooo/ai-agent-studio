import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateCharacterSchema } from "@/lib/schemas/animation.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const character = await animationService.getCharacter(id);
    return NextResponse.json({ success: true, character });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không tìm thấy nhân vật";
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
    const validated = updateCharacterSchema.parse(body);
    const updated = await animationService.updateCharacter(id, validated);
    return NextResponse.json({ success: true, character: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật nhân vật thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
