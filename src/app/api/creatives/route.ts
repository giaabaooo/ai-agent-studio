import { NextRequest, NextResponse } from "next/server";
import { creativeService } from "@/modules/creatives/creative.service";
import { CreativeStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const status = (searchParams.get("status") as CreativeStatus) || undefined;

    const creatives = await creativeService.getCreatives({
      creatorId,
      productId,
      status,
    });

    return NextResponse.json({ creatives });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải danh sách creative";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
