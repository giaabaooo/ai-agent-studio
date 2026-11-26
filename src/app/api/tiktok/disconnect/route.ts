import { NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export async function POST() {
  try {
    const result = await tiktokService.disconnect();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ngắt kết nối TikTok thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
