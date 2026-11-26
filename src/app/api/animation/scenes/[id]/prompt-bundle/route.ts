import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bundle = await animationService.getScenePromptBundle(id);
    return NextResponse.json({ success: true, bundle });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tạo prompt bundle thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
