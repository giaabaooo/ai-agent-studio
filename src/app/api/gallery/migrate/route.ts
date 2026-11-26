import { NextRequest, NextResponse } from "next/server";
import { galleryService } from "@/modules/media/gallery.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID mục cần đồng bộ" }, { status: 400 });
    }

    const updated = await galleryService.migrateLocalItemToCloud(id);
    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
