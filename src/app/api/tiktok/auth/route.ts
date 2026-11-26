import { NextRequest, NextResponse } from "next/server";
import { tiktokService } from "@/modules/tiktok/tiktok.service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const shouldRedirect = searchParams.get("redirect") === "true";

    const { authUrl, state } = await tiktokService.createOAuthSession();

    if (shouldRedirect) {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ success: true, authUrl, state });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Khởi tạo TikTok OAuth thất bại";
    const searchParams = req.nextUrl.searchParams;
    if (searchParams.get("redirect") === "true") {
      const url = new URL("/settings", req.url);
      url.searchParams.set("error", msg);
      return NextResponse.redirect(url.toString());
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
