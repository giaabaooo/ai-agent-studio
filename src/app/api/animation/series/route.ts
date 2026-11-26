import { NextRequest, NextResponse } from "next/server";
import { animationService } from "@/modules/animation/animation.service";
import { prisma } from "@/lib/db";
import { SeriesStatus } from "@prisma/client";

export async function GET() {
  try {
    const list = await animationService.listSeries();
    return NextResponse.json({ success: true, series: list });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tải danh sách series thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug } = body;
    if (!title || !slug) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên series và slug" },
        { status: 400 }
      );
    }

    const created = await prisma.animationSeries.create({
      data: {
        title,
        slug,
        status: SeriesStatus.DRAFT,
      },
    });

    return NextResponse.json({ success: true, series: created }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tạo series thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
