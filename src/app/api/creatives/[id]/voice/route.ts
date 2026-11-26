import { NextRequest, NextResponse } from "next/server";
import { mediaService } from "@/modules/media/media.service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json({ asset: await mediaService.generateVoice((await params).id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo voice" }, { status: 400 });
  }
}
