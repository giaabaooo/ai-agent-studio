import { NextRequest, NextResponse } from "next/server";
import { mediaService } from "@/modules/media/media.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await mediaService.confirmRawAsFinal(id);
    return NextResponse.json({ success: true, asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xác nhận video gốc" },
      { status: 400 }
    );
  }
}
