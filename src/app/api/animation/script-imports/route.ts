import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp DOCX kịch bản để tải lên" },
        { status: 400 }
      );
    }

    const fileName = file.name || "script.docx";
    if (!fileName.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "Định dạng tệp không hợp lệ. Vui lòng tải lên tệp .docx" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dung lượng tệp vượt quá giới hạn tối đa 25MB" },
        { status: 400 }
      );
    }

    const result = await animationService.createImportDraft(buffer, fileName);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Xử lý tệp DOCX thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
