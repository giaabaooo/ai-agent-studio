import { Brain, Sparkles } from "lucide-react";

export default function AnalystPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <span>Daily Analyst (Gemini Reasoning)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Hệ thống suy luận chiến lược hằng ngày: Phân tích nguyên nhân thắng/thua và đề xuất hướng tối ưu.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
        <h3 className="font-bold text-sm mb-1">Gemini Daily Analyst Engine (Phase 4 Ready)</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Gemini 3.8 Flash đọc bảng số liệu thực tế tổng hợp được từ kênh để rút ra giả thuyết, đề xuất tăng/giảm ngân sách danh mục và cập nhật Knowledge Base.
        </p>
      </div>
    </div>
  );
}
