import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";
import { CharacterReferenceType } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const referenceType = formData.get("referenceType") as CharacterReferenceType | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp ảnh để tải lên" },
        { status: 400 }
      );
    }

    if (!referenceType || !Object.values(CharacterReferenceType).includes(referenceType)) {
      return NextResponse.json(
        { error: "Vui lòng chọn góc/loại ảnh tham chiếu (referenceType) hợp lệ" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await localStorageProvider.saveFile(
      buffer,
      "characters",
      file.name,
      file.type || "image/png"
    );

    const asset = await animationService.attachReferenceAsset(
      id,
      referenceType,
      saved.localPath,
      saved.mimeType,
      { fileName: file.name, fileSize: saved.fileSize }
    );

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tải lên ảnh tham chiếu thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
