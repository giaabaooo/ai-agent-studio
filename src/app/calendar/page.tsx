import { Calendar, Clock, Milestone } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          <span>Lịch Đăng Bài &amp; Kế Hoạch Nội Dung (Calendar)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi hàng chờ xuất bản (Publishing Queue) và kế hoạch đăng bài được sinh tự động bởi Daily Analyst.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-bold text-sm mb-1">Content Plan Module (Phase 4 Ready)</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Mô hình phân bổ 70% Exploit / 20% Adjacent / 10% Explore sẽ tự động xếp lịch đăng video theo khung giờ vàng sau khi tài khoản tích lũy đủ dữ liệu video.
        </p>
      </div>
    </div>
  );
}
