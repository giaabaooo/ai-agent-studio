import { FlaskConical } from "lucide-react";

export default function ExperimentsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <span>Thử Nghiệm A/B (Experiments)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi các bài test đối đầu (8s vs 12s, Linh vs Nam, Problem vs Curiosity) để đưa ra kết luận dựa trên số liệu.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-bold text-sm mb-1">A/B Testing Framework (Phase 4 Ready)</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Mỗi thử nghiệm đều có câu hỏi nghiên cứu, giả thuyết kiểm tra và chỉ số mục tiêu cụ thể, không để AI cảm tính đưa ra kết luận.
        </p>
      </div>
    </div>
  );
}
