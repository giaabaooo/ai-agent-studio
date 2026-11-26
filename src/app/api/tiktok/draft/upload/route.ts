import { NextRequest, NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { creativeId } = body;

    if (!creativeId) {
      return NextResponse.json(
        { error: "Thiếu creativeId trong yêu cầu tải lên nháp" },
        { status: 400 }
      );
    }

    const result = await tiktokService.uploadDraft(creativeId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload nháp TikTok thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
