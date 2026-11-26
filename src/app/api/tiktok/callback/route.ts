import { NextRequest, NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const settingsUrl = new URL("/settings", req.url);

  if (error) {
    settingsUrl.searchParams.set(
      "error",
      errorDescription || `TikTok Authorization Error: ${error}`
    );
    return NextResponse.redirect(settingsUrl.toString());
  }

  if (!code || !state) {
    settingsUrl.searchParams.set(
      "error",
      "Thiếu tham số code hoặc state từ phản hồi của TikTok"
    );
    return NextResponse.redirect(settingsUrl.toString());
  }

  try {
    await tiktokService.handleOAuthCallback(code, state);
    settingsUrl.searchParams.set("success", "tiktok_connected");
    return NextResponse.redirect(settingsUrl.toString());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Xử lý kết nối TikTok thất bại";
    settingsUrl.searchParams.set("error", msg);
    return NextResponse.redirect(settingsUrl.toString());
  }
}
