import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const preflight = await animationService.validateEpisodeRender(id);
    return NextResponse.json({ success: true, preflight });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Kiểm tra điều kiện render thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
