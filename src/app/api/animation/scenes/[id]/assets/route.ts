import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";
import { AnimationAssetType } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = formData.get("assetType") as AnimationAssetType | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp asset để tải lên" },
        { status: 400 }
      );
    }

    if (!assetType || !Object.values(AnimationAssetType).includes(assetType)) {
      return NextResponse.json(
        { error: "Loại asset không hợp lệ (KEYFRAME, RAW_VIDEO, VOICE, SFX, MUSIC)" },
        { status: 400 }
      );
    }

    const subFolder = assetType === AnimationAssetType.RAW_VIDEO
      ? "animation/raw_videos"
      : assetType === AnimationAssetType.KEYFRAME
      ? "animation/keyframes"
      : "animation/audio";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await localStorageProvider.saveFile(
      buffer,
      subFolder,
      file.name,
      file.type || (assetType === AnimationAssetType.RAW_VIDEO ? "video/mp4" : "image/png")
    );

    const asset = await animationService.attachSceneAsset(
      id,
      assetType,
      saved.localPath,
      saved.mimeType,
      saved.fileSize,
      { originalFileName: file.name }
    );

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tải lên asset cảnh thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
