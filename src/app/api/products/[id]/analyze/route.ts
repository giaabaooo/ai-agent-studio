import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/modules/products/product.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await productService.analyzeProduct(id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Phân tích sản phẩm thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
