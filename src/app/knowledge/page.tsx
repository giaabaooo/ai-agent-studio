import { BookOpen } from "lucide-react";

export default function KnowledgePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span>Kho Tri Thức Tài Khoản (Knowledge Base)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Các quy tắc được kiểm chứng từ dữ liệu thực tế của kênh, thay thế cho kiến thức chung chung của AI.
        </p>
      </div>

      <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-bold text-sm mb-1">Knowledge Rule Engine (Phase 4 Ready)</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Quy tắc chỉ được thăng hạng thành ACTIVE khi có tối thiểu 5 video hỗ trợ và chỉ số kiểm định đạt mức tin cậy trên 80%.
        </p>
      </div>
    </div>
  );
}
