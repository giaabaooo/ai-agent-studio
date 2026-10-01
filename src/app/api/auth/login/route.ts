import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/modules/auth/auth.service";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await authService.login(email, password);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
