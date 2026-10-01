import { NextRequest, NextResponse } from "next/server";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subFolder = (formData.get("subFolder") as string) || "products";

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

    return NextResponse.json({ success: true, ...saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tải lên tệp thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
