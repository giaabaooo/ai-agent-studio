import { NextResponse } from "next/server";
import { creatorService } from "@/modules/creators/creator.service";

export async function GET() {
  try {
    const creators = await creatorService.getCreators();
    return NextResponse.json({ creators });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải creators";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
