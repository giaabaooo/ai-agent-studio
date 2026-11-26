import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { updateSeriesSchema } from "@/lib/schemas/animation.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const series = await animationService.getSeries(id);
    return NextResponse.json({ success: true, series });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Không tìm thấy series";
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
    const validated = updateSeriesSchema.parse(body);
    const updated = await animationService.updateSeries(id, validated);
    return NextResponse.json({ success: true, series: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật series thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
