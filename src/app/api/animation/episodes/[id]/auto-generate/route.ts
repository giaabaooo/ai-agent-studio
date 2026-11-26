import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await animationService.autoGenerateEpisodeVideos(id);

    return NextResponse.json({
      success: true,
      message: "Tạo toàn bộ video cảnh và render tập phim thành công!",
      ...result,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Tạo video tập phim thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
