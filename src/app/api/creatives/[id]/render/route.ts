import { NextRequest, NextResponse } from "next/server";
import { mediaService } from "@/modules/media/media.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      asset: await mediaService.renderFinal((await params).id, {
        replaceNativeAudio: body.replaceNativeAudio === true,
        burnSubtitles: body.burnSubtitles === true,
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể render video" }, { status: 400 });
  }
}
