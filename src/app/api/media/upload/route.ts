import { NextRequest, NextResponse } from "next/server";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";
import { mediaService } from "@/modules/media/media.service";
import { AssetType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subFolder = (formData.get("subFolder") as string) || "products";
    const creativeId = formData.get("creativeId") as string | null;
    const assetType = formData.get("assetType") as AssetType | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp để tải lên" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await localStorageProvider.saveFile(
      buffer,
      subFolder,
      file.name,
      file.type || "application/octet-stream"
    );

    const asset = creativeId && assetType
      ? await mediaService.attachUpload(creativeId, assetType, saved.localPath, saved.mimeType, saved.fileSize)
      : null;

    return NextResponse.json({ success: true, ...saved, asset });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tải lên tệp thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
