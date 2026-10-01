import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/modules/products/product.service";
import { createProductSchema } from "@/lib/schemas/product.schema";
import { ProductStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as ProductStatus | null;
    const products = await productService.getProducts(statusParam || undefined);
    return NextResponse.json({ products });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải sản phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createProductSchema.parse(body);
    const product = await productService.createProduct(validated);
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Tạo sản phẩm thất bại";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
