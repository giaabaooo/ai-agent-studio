import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/modules/products/product.service";
import { ProductStatus } from "@prisma/client";
import { createProductSchema } from "@/lib/schemas/product.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await productService.getProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm" },
        { status: 404 }
      );
    }
    return NextResponse.json({ product });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải thông tin sản phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.status) {
      const updated = await productService.updateProductStatus(
        id,
        body.status as ProductStatus
      );
      return NextResponse.json({ success: true, product: updated });
    }
    const validated = createProductSchema.parse(body);
    const updated = await productService.updateProduct(id, validated);
    return NextResponse.json({ success: true, product: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cập nhật sản phẩm thất bại";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
