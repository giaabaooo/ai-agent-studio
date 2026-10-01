import { NextResponse } from "next/server";
import { authService } from "@/modules/auth/auth.service";

export async function GET() {
  const user = await authService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}
