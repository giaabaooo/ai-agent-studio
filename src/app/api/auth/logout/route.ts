import { NextResponse } from "next/server";
import { authService } from "@/modules/auth/auth.service";

export async function POST() {
  await authService.logout();
  return NextResponse.json({ success: true });
}
