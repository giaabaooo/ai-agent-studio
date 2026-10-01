import { BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <span>Thống Kê Hiệu Suất Đa Chiều (Analytics)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Báo cáo hiệu suất theo Creator (Linh vs Nam), Danh mục, Hook Type, Thời lượng và Khung giờ đăng.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-bold text-sm mb-1">Deterministic Metrics Engine (Phase 3 &amp; 4)</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Các chỉ số Like Rate, Share Rate, View Velocity được tính toán 100% bằng code SQL/TypeScript từ snapshot đồng bộ chính thức của TikTok.
        </p>
      </div>
    </div>
  );
}
