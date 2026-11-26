import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await animationService.getFullEpisodePromptBundle(id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Không thể lấy prompt kịch bản toàn tập";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
