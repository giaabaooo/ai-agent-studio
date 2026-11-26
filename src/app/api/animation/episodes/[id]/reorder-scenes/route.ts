import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { reorderScenesSchema } from "@/lib/schemas/animation.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = reorderScenesSchema.parse(body);
    await animationService.reorderScenes(id, validated.sceneIds);
    return NextResponse.json({ success: true, message: "Đã cập nhật thứ tự cảnh" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cập nhật thứ tự cảnh thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
