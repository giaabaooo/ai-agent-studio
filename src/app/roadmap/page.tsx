import { Milestone, CheckCircle2, Clock } from "lucide-react";

const stages = [
  {
    name: "NEW",
    followers: "0 - 300 Follower",
    goal: "Tối ưu retention, completion, share và tìm format hook ban đầu",
    current: true,
  },
  {
    name: "GROWING",
    followers: "300 - 700 Follower",
    goal: "Tìm creator thắng (Linh hay Nam), category thắng và loại bỏ nhóm yếu",
    current: false,
  },
  {
    name: "PRE_AFFILIATE",
    followers: "700 - 1000 Follower",
    goal: "Chuẩn bị hồ sơ xác minh mở giỏ hàng TikTok Shop",
    current: false,
  },
  {
    name: "AFFILIATE_ACTIVE",
    followers: "1000+ Follower",
    goal: "Bắt đầu gắn giỏ hàng affiliate thủ công, đo clicks, orders và hoa hồng",
    current: false,
  },
  {
    name: "SCALING",
    followers: "Doanh số lặp lại",
    goal: "Quy mô hóa các creative thắng cuộc, tối ưu lợi nhuận ròng",
    current: false,
  },
];

export default function RoadmapPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Milestone className="w-6 h-6 text-primary" />
          <span>Lộ Trình Phát Triển Tài Khoản (Account Roadmap)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Các mốc phát triển kênh từ số 0 đến Affiliate Active. Chuyển stage có lưu lịch sử và cần Owner xác nhận.
        </p>
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => (
          <div
            key={stage.name}
            className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
              stage.current
                ? "bg-primary/5 border-primary shadow-sm"
                : "bg-card border-border opacity-70"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  stage.current
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                0{idx + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">{stage.name}</h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({stage.followers})
                  </span>
                  {stage.current && (
                    <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                      CURRENT STAGE
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stage.goal}</p>
              </div>
            </div>

            <div className="shrink-0">
              {stage.current ? (
                <span className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Đang thực hiện</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Chưa mở khóa</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
