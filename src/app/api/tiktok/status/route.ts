import { NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await tiktokService.getAccountStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lấy trạng thái TikTok thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
