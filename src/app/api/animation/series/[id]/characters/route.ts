import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { createCharacterSchema } from "@/lib/schemas/animation.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characters = await animationService.listCharacters(id);
    return NextResponse.json({ success: true, characters });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tải danh sách nhân vật thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = createCharacterSchema.parse(body);
    const created = await animationService.createCharacter(id, validated);
    return NextResponse.json({ success: true, character: created }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Thêm nhân vật thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
