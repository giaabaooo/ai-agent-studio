import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { renderEpisodeSchema } from "@/lib/schemas/animation.schema";

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
      // Empty body is acceptable
    }

    const validated = renderEpisodeSchema.parse(body);
    const render = await animationService.renderEpisode(id, validated);

    return NextResponse.json({
      success: true,
      message: "Render tập phim 1080x1920 thành công",
      render,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Render tập phim thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
