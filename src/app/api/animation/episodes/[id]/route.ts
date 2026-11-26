import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateEpisodeSchema } from "@/lib/schemas/animation.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episode = await animationService.getEpisode(id);
    return NextResponse.json({ success: true, episode });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không tìm thấy tập phim";
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
    const validated = updateEpisodeSchema.parse(body);
    const updated = await animationService.updateEpisode(id, validated);
    return NextResponse.json({ success: true, episode: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật tập phim thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
