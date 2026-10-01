"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number | null;
  commissionRate: number | null;
  status: "CANDIDATE" | "TESTING" | "WINNER" | "PAUSED" | "REJECTED";
  description: string;
  images: { id: string; localPath: string; isPrimary: boolean }[];
  score: {
    overallScore: number;
    visualScore: number;
    accountFitScore: number;
  } | null;
  _count: { creatives: number };
}

const statusTabs = [
  { key: "CANDIDATE", label: "Candidates (Chờ duyệt)" },
  { key: "TESTING", label: "Testing (Đang test)" },
  { key: "WINNER", label: "Winners (Thắng lớn)" },
  { key: "PAUSED", label: "Paused (Tạm dừng)" },
  { key: "REJECTED", label: "Rejected (Loại bỏ)" },
] as const;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<string>("CANDIDATE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?status=${activeTab}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Lỗi tải sản phẩm:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <span>Kho Sản Phẩm &amp; Đề Xuất (Products)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý vòng đời sản phẩm từ Candidate đến Winner dựa trên chỉ số thực nghiệm của tài khoản.
          </p>
        </div>

        <Link
          href="/products/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/25 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Thêm Sản Phẩm Mới</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Đang tải danh sách sản phẩm...
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
          <p className="text-sm font-semibold mb-2">Chưa có sản phẩm nào ở trạng thái này</p>
          <p className="text-xs text-muted-foreground mb-4">
            Thêm sản phẩm mới và nhấn &quot;Phân tích sản phẩm&quot; để Gemini đánh giá tiềm năng.
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Thêm sản phẩm ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => {
            const primaryImg = p.images.find((i) => i.isPrimary) || p.images[0];
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden border border-border flex items-center justify-center font-bold text-xs text-muted-foreground">
                      {primaryImg ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/media/file/${primaryImg.localPath}`}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        "SP"
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-1">
                        {p.category}
                      </span>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.price ? Number(p.price).toLocaleString() + " đ" : "Chưa set giá"}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Score pill */}
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between text-xs mb-4">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span>Overall Score:</span>
                    </span>
                    <span className="font-bold text-primary text-sm">
                      {p.score ? `${p.score.overallScore}/10` : "Chưa tính"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">
                    {p._count.creatives} kịch bản
                  </span>
                  <Link
                    href={`/products/new?productId=${p.id}`}
                    className="font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Chi tiết &amp; Kịch bản</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
