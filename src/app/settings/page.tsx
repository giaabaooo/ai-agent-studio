import { Settings, CheckCircle2, ShieldCheck, Database, Film, Bot } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <span>Cấu Hình Hệ Thống (Settings)</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Trạng thái hạ tầng Local-First, bảo mật, nhà cung cấp AI và kết nối TikTok.
        </p>
      </div>

      <div className="space-y-4">
        {/* Environment & Free Only */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Chế độ Chi phí (FREE_ONLY)</h4>
              <p className="text-xs text-muted-foreground">
                Tuyệt đối không tự động chuyển sang API tính phí khi hết quota
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            ENABLED
          </span>
        </div>

        {/* Database */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Cơ Sở Dữ Liệu PostgreSQL</h4>
              <p className="text-xs text-muted-foreground font-mono">
                Port 5433 &bull; affiliate_ai_studio (Local Mac Dedicated Cluster)
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>CONNECTED</span>
          </span>
        </div>

        {/* AI Provider */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Mô Hình AI Phân Tích &amp; Kịch Bản</h4>
              <p className="text-xs text-muted-foreground">
                Google Gemini API &bull; Model: <code className="font-mono text-foreground font-bold">gemini-3.8-flash</code>
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">
            @google/genai
          </span>
        </div>

        {/* FFmpeg */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Bộ Hậu Kỳ Video FFmpeg Local</h4>
              <p className="text-xs text-muted-foreground font-mono">
                ~/.local/bin/ffmpeg (v6.0 with Apple Silicon NEON &amp; libx264)
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>READY</span>
          </span>
        </div>
      </div>
    </div>
  );
}
