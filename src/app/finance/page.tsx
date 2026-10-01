import { DollarSign, Lock } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          <span>Tài Chính &amp; Doanh Thu Affiliate (Finance)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi doanh số (GMV), lượt click sản phẩm, tỷ lệ chuyển đổi và hoa hồng affiliate.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-bold text-sm mb-1">Mô-đun Khóa Cho Đến Khi Đạt AFFILIATE_ACTIVE</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Tài khoản hiện đang ở giai đoạn <strong>NEW</strong>. Tab Tài chính sẽ được tự động kích hoạt đầy đủ tính năng sau khi tài khoản đạt đủ điều kiện và được phê duyệt TikTok Shop Affiliate.
        </p>
      </div>
    </div>
  );
}
