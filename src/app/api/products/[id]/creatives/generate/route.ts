import { NextRequest, NextResponse } from "next/server";
import { creativeService } from "@/modules/creatives/creative.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let creatorOverride: "LINH" | "NAM" | undefined = undefined;
    try {
      const body = await req.json();
      if (body.creatorName === "LINH" || body.creatorName === "NAM") {
        creatorOverride = body.creatorName;
      }
    } catch {
      // Body is optional
    }

    const creatives = await creativeService.generateCreativesForProduct(
      id,
      creatorOverride
    );

    return NextResponse.json({ success: true, creatives });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sinh kịch bản thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
