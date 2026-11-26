import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Layers,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const scheduleDays = [
  {
    day: "Thứ 2",
    date: "Hôm nay",
    isToday: true,
    slots: [
      {
        time: "11:30",
        type: "EXPLOIT (70%)",
        creator: "LINH",
        product: "Nồi Chiên Không Dầu",
        hook: "Mẹo chiên gà giòn rụm không khô",
        status: "READY",
      },
      {
        time: "20:00",
        type: "ADJACENT (20%)",
        creator: "NAM",
        product: "Nồi Chiên Không Dầu",
        hook: "Lỗi 90% người dùng mắc phải",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Thứ 3",
    date: "Ngày mai",
    isToday: false,
    slots: [
      {
        time: "12:00",
        type: "EXPLOIT (70%)",
        creator: "LINH",
        product: "Bình Giữ Nhiệt 900ml",
        hook: "Test đá viên sau 24 giờ",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Thứ 4",
    date: "Sắp tới",
    isToday: false,
    slots: [
      {
        time: "19:30",
        type: "EXPLORE (10%)",
        creator: "NAM",
        product: "Bàn Phím Cơ Silent",
        hook: "Âm thanh gõ ban đêm không ồn",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Thứ 5",
    date: "Sắp tới",
    isToday: false,
    slots: [
      {
        time: "12:00",
        type: "EXPLOIT (70%)",
        creator: "LINH",
        product: "Bình Giữ Nhiệt 900ml",
        hook: "So sánh bình 80k và bình 200k",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Thứ 6",
    date: "Sắp tới",
    isToday: false,
    slots: [
      {
        time: "20:30",
        type: "EXPLOIT (70%)",
        creator: "NAM",
        product: "Nồi Chiên Không Dầu",
        hook: "Nướng thịt xiên 10 phút",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Thứ 7",
    date: "Cuối tuần",
    isToday: false,
    slots: [
      {
        time: "11:30",
        type: "ADJACENT (20%)",
        creator: "LINH",
        product: "Chảo Chống Dính Đá",
        hook: "Thử chiên trứng không dùng dầu",
        status: "PLANNED",
      },
    ],
  },
  {
    day: "Chủ Nhật",
    date: "Cuối tuần",
    isToday: false,
    slots: [
      {
        time: "19:00",
        type: "EXPLORE (10%)",
        creator: "NAM",
        product: "Đèn Bàn Chống Cận",
        hook: "Góc làm việc ban đêm chill",
        status: "PLANNED",
      },
    ],
  },
];

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>Lịch Đăng Bài &amp; Kế Hoạch Nội Dung (Calendar)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Theo dõi kế hoạch đăng bài tự động hóa, phân bổ tỷ lệ 70/20/10 và khung giờ vàng TikTok.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Analyst Scheduler</span>
          </span>
        </div>
      </div>

      {/* Strategy Ratio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-emerald-500">EXPLOIT (Khai thác)</span>
            <span className="font-bold text-foreground">70%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Lặp lại công thức hook &amp; sản phẩm đã có chuyển đổi cao.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-indigo-400">ADJACENT (Mở rộng)</span>
            <span className="font-bold text-foreground">20%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Đổi góc nhìn (angle) hoặc chuyển creator cho sản phẩm quen thuộc.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-pink-400">EXPLORE (Khám phá)</span>
            <span className="font-bold text-foreground">10%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Thử nghiệm sản phẩm mới hoặc định dạng kịch bản hoàn toàn mới.
          </p>
        </div>
      </div>

      {/* Responsive Weekly Schedule Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>Lịch Trình Tuần Này (Khung Giờ Vàng)</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Giờ đăng đề xuất: 11:30 - 12:30 &bull; 19:30 - 20:30
          </span>
        </div>

        {/* Responsive Grid: 1 column on mobile, 2 on tablet, 7 on large desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {scheduleDays.map((d) => (
            <div
              key={d.day}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                d.isToday
                  ? "bg-primary/5 border-primary/40 shadow-sm shadow-primary/10"
                  : "bg-card border-border"
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-2 mb-2.5">
                  <span className="font-bold text-xs text-foreground">{d.day}</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      d.isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground bg-secondary"
                    }`}
                  >
                    {d.date}
                  </span>
                </div>

                <div className="space-y-2">
                  {d.slots.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-secondary/50 border border-border space-y-1.5 hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{s.time}</span>
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            s.type.includes("EXPLOIT")
                              ? "bg-emerald-500/10 text-emerald-500"
                              : s.type.includes("ADJACENT")
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "bg-pink-500/10 text-pink-400"
                          }`}
                        >
                          {s.type.split(" ")[0]}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-foreground line-clamp-1">
                        {s.product}
                      </div>

                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        &quot;{s.hook}&quot;
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                        <span className="font-bold text-primary">{s.creator}</span>
                        <span
                          className={`font-semibold ${
                            s.status === "READY"
                              ? "text-emerald-500 flex items-center gap-0.5"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s.status === "READY" && <CheckCircle2 className="w-2.5 h-2.5" />}
                          <span>{s.status === "READY" ? "Sẵn sàng" : "Đã xếp lịch"}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
