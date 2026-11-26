import { NextRequest, NextResponse } from "next/server";
import { cloudinaryService } from "@/providers/storage/cloudinary.service";

export async function GET() {
  try {
    const config = await cloudinaryService.getConfigInfo();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cloudName, apiKey, apiSecret } = body;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ Cloud Name, API Key và API Secret" },
        { status: 400 }
      );
    }

    await cloudinaryService.saveConfig({ cloudName, apiKey, apiSecret });
    return NextResponse.json({ success: true, message: "Đã lưu cấu hình Cloudinary thành công" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
