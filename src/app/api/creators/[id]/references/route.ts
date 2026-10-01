import { NextRequest, NextResponse } from "next/server";
import { creatorService } from "@/modules/creators/creator.service";
import { ReferenceImageType } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { type, localPath } = await req.json();

    if (!type || !localPath) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ type và localPath" },
        { status: 400 }
      );
    }

    const ref = await creatorService.addReferenceImage(
      id,
      type as ReferenceImageType,
      localPath
    );

    return NextResponse.json({ success: true, reference: ref });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Thêm ảnh reference thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
