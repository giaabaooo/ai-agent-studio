import { NextRequest, NextResponse } from "next/server";
import { creativeService } from "@/modules/creatives/creative.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creative = await creativeService.getCreativeById(id);
    if (!creative) {
      return NextResponse.json(
        { error: "Không tìm thấy creative" },
        { status: 404 }
      );
    }
    return NextResponse.json({ creative });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải creative";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
