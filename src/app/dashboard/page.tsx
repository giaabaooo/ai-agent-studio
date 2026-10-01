import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Users,
  Eye,
  TrendingUp,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Clapperboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const account = await prisma.tikTokAccount.findFirst({
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  const latestSnapshot = account?.snapshots[0] || {
    followerCount: 0,
    followingCount: 5,
    likesCount: 0,
    videoCount: 0,
  };

  const productCount = await prisma.product.count();
  const creativeCount = await prisma.creative.count();

  const candidateProducts = await prisma.product.findMany({
    where: { status: "CANDIDATE" },
    include: { score: true, images: true },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const recentCreatives = await prisma.creative.findMany({
    include: { creator: true, product: true },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Lộ trình Giai đoạn 1 &bull; NEW
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              @affiliate_ai_studio
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Chào mừng đến với Affiliate AI Studio
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tài khoản TikTok đang ở giai đoạn khởi tạo (0 - 300 follower). Mục tiêu tối thượng hiện tại: Tối ưu tỷ lệ giữ chân (retention), tỷ lệ xem hết (completion), và lượt share trên mỗi video thử nghiệm.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/products/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm sản phẩm</span>
          </Link>
          <Link
            href="/content"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-all border border-border"
          >
            <Clapperboard className="w-4 h-4" />
            <span>Content Lab</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Followers Kênh</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{latestSnapshot.followerCount.toLocaleString()}</div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Mục tiêu thăng hạng: 300</span>
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Tổng Lượt Xem (24h)</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Đồng bộ từ TikTok Display API
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Sản phẩm trong Kho</span>
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {productCount} items
            </span>
          </div>
          <div className="text-2xl font-bold">{productCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {candidateProducts.length} sản phẩm đang ở hàng chờ duyệt
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-medium">Kịch bản Content Lab</span>
            <Clapperboard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold">{creativeCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Được sinh bởi Gemini 3.8 Flash
          </p>
        </div>
      </div>

      {/* Main Content Split: Candidates & Recent Creatives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Product Candidates Queue */}
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">Hàng chờ Sản phẩm (Candidates)</h3>
              <p className="text-xs text-muted-foreground">
                Sản phẩm tiềm năng đang chờ phân tích và duyệt thử nghiệm
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {candidateProducts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground mb-3">
                Chưa có sản phẩm nào trong hàng chờ.
              </p>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary text-primary-foreground rounded-lg"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm sản phẩm đầu tiên</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {candidateProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-secondary/40 border border-border flex items-center justify-between gap-3 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 overflow-hidden border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {p.images[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/media/file/${p.images[0].localPath}`}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        "SP"
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {p.category} &bull; {p.price ? Number(p.price).toLocaleString() + " đ" : "Chưa set giá"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Score: {p.score?.overallScore || "Chưa tính"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Content Lab Recent Creatives */}
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">Content Lab — Kịch bản gần nhất</h3>
              <p className="text-xs text-muted-foreground">
                Kịch bản 12s được tối ưu theo format Problem-Demo &amp; Curiosity
              </p>
            </div>
            <Link
              href="/content"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>Vào Lab</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentCreatives.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground mb-3">
                Chưa có kịch bản nào được tạo.
              </p>
              <p className="text-xs text-muted-foreground">
                Hãy thêm sản phẩm và bấm &quot;Phân tích sản phẩm&quot; để sinh 3 kịch bản đầu tiên.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCreatives.map((c) => (
                <Link
                  key={c.id}
                  href={`/content/${c.id}`}
                  className="p-3.5 rounded-xl bg-secondary/40 border border-border block hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">
                      {c.creator.name} &bull; {c.hookType}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {c.claimGuardStatus}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium line-clamp-1">
                    &quot;{c.hook}&quot;
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Sản phẩm: {c.product.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Strategist Insight Banner */}
      <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">
            Khuyến nghị Chiến lược từ Gemini Daily Analyst
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Ở giai đoạn <strong>NEW</strong>, thuật toán TikTok sẽ thử nghiệm video trên tệp 200-500 người dùng đầu tiên. Ưu tiên tuyệt đối việc giữ hình ảnh sản phẩm chân thực, tự nhiên và hook trực diện vào vấn đề trong 2 giây đầu. Không chèn giá tiền hoặc thúc ép mua hàng để tránh bị phân loại nhầm thành video quảng cáo thương mại.
          </p>
        </div>
      </div>
    </div>
  );
}
