import { NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export async function POST() {
  try {
    const result = await tiktokService.syncData();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Đồng bộ TikTok thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
