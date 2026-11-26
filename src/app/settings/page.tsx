"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  Settings,
  CheckCircle2,
  ShieldCheck,
  Database,
  Film,
  Bot,
  RefreshCw,
  ExternalLink,
  Unlink,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Video,
  Heart,
  Lock,
  Layers,
} from "lucide-react";

interface TikTokStatusResponse {
  configured: boolean;
  status: "NOT_CONFIGURED" | "NOT_CONNECTED" | "CONNECTED" | "EXPIRED";
  message: string;
  account: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    stage: string;
    openId: string;
  } | null;
  snapshot: {
    followerCount: number;
    followingCount: number;
    likesCount: number;
    videoCount: number;
    capturedAt: string;
  } | null;
  tokenExpiresAt?: string | null;
  scope?: string;
  draftUploadEnabled?: boolean;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();
  const [data, setData] = useState<TikTokStatusResponse | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tiktok/status");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load TikTok status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (successParam === "tiktok_connected") {
      setNotification({
        type: "success",
        message: "Kết nối tài khoản TikTok thành công qua OAuth 2.0 PKCE!",
      });
    } else if (errorParam) {
      setNotification({
        type: "error",
        message: decodeURIComponent(errorParam),
      });
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      setActionLoading("connect");
      window.location.href = "/api/tiktok/auth?redirect=true";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể bắt đầu kết nối TikTok");
      setActionLoading(null);
    }
  };

  const handleSync = async () => {
    try {
      setActionLoading("sync");
      const res = await fetch("/api/tiktok/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Đồng bộ thất bại");
      }
      setNotification({
        type: "success",
        message: `Đồng bộ thành công! Đã cập nhật snapshot và đối chiếu ${json.matchedPublicationsCount || 0} video.`,
      });
      await fetchStatus();
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Đồng bộ thất bại",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Bạn có chắc chắn muốn ngắt kết nối tài khoản TikTok này?")) {
      return;
    }
    try {
      setActionLoading("disconnect");
      const res = await fetch("/api/tiktok/disconnect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ngắt kết nối thất bại");
      }
      setNotification({
        type: "success",
        message: "Đã ngắt kết nối tài khoản TikTok thành công.",
      });
      await fetchStatus();
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Ngắt kết nối thất bại",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <span>Cấu Hình Hệ Thống &amp; Kết Nối TikTok</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý kết nối TikTok OAuth 2.0 PKCE, Display API, mã hóa token AES-256-GCM và hạ tầng Local-First.
        </p>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* TIKTOK INTEGRATION CARD */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-pink-500/20">
              TT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Tài Khoản TikTok Chính Thức</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  Login Kit + Display API
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Xác thực Authorization Code + PKCE (RFC 7636) &bull; Token mã hóa AES-256-GCM
              </p>
            </div>
          </div>

          <div>
            {loading ? (
              <span className="text-xs font-mono text-muted-foreground animate-pulse">
                Đang kiểm tra...
              </span>
            ) : data?.status === "CONNECTED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONNECTED</span>
              </span>
            ) : data?.status === "EXPIRED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>TOKEN EXPIRED</span>
              </span>
            ) : data?.status === "NOT_CONFIGURED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>NOT CONFIGURED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
                <span>CHƯA KẾT NỐI</span>
              </span>
            )}
          </div>
        </div>

        {/* Content based on status */}
        {!loading && data?.status === "NOT_CONFIGURED" && (
          <div className="p-4 rounded-xl bg-secondary/40 border border-dashed border-border space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">
                  TikTok API Credentials chưa được điền trong file môi trường
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Để kết nối TikTok chính thức, hãy đăng ký TikTok Developer App (Login Kit &amp; Display API) và cấu hình 3 biến sau:
                </p>
                <div className="p-2.5 rounded-lg bg-background font-mono text-[11px] text-muted-foreground space-y-1 border border-border">
                  <div>TIKTOK_CLIENT_KEY=&quot;your_client_key&quot;</div>
                  <div>TIKTOK_CLIENT_SECRET=&quot;your_client_secret&quot;</div>
                  <div>TIKTOK_REDIRECT_URI=&quot;http://localhost:3000/api/tiktok/callback&quot;</div>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  * Hệ thống vẫn hoạt động an toàn ở chế độ offline/local mà không cần TikTok credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && data?.status === "CONNECTED" && data.account && (
          <div className="space-y-5">
            {/* Account Profile Card */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {data.account.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={data.account.avatarUrl}
                      alt={data.account.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    data.account.displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{data.account.displayName}</span>
                    <span className="text-[10px] font-mono font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      @{data.account.username}
                    </span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    OpenID: {data.account.openId.slice(0, 12)}... &bull; Giai đoạn:{" "}
                    <span className="text-primary font-bold">{data.account.stage}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      actionLoading === "sync" ? "animate-spin" : ""
                    }`}
                  />
                  <span>{actionLoading === "sync" ? "Đang đồng bộ..." : "Đồng bộ"}</span>
                </button>
                <button
                  onClick={handleConnect}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  <span>Reconnect</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading !== null}
                  className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50 text-muted-foreground"
                  title="Ngắt kết nối"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Account Metrics Snapshot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Followers</span>
                </div>
                <div className="text-xl font-bold font-mono">
                  {data.snapshot?.followerCount.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Tổng Likes</span>
                </div>
                <div className="text-xl font-bold font-mono">
                  {data.snapshot?.likesCount.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Video công khai</span>
                </div>
                <div className="text-xl font-bold font-mono">
                  {data.snapshot?.videoCount.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sync gần nhất</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate mt-1">
                  {data.snapshot?.capturedAt
                    ? new Date(data.snapshot.capturedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "Chưa có"}
                </div>
              </div>
            </div>

            {/* Token Security Details */}
            <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Trạng thái bảo mật Token:</span>
                  <span className="font-mono text-emerald-500 font-bold">
                    AES-256-GCM Encrypted
                  </span>
                </div>
                {data.tokenExpiresAt && (
                  <div className="text-muted-foreground font-mono text-[11px]">
                    Hết hạn: {new Date(data.tokenExpiresAt).toLocaleString("vi-VN")}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-muted-foreground">Scopes đã cấp:</span>
                {(data.scope || "user.info.basic,user.info.profile,user.info.stats,video.list")
                  .split(",")
                  .map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px] text-foreground border border-border"
                    >
                      {s.trim()}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {!loading && (data?.status === "NOT_CONNECTED" || data?.status === "EXPIRED") && (
          <div className="p-6 rounded-xl bg-secondary/30 border border-border text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold text-sm">
                {data?.status === "EXPIRED"
                  ? "Phiên kết nối TikTok đã hết hạn"
                  : "Chưa kết nối tài khoản TikTok"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đăng nhập TikTok thông qua cổng chính thức để cấp quyền Display API, đồng bộ lượt xem, tương tác video và chuẩn bị tải nháp.
              </p>
            </div>
            <div>
              <button
                onClick={handleConnect}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {actionLoading === "connect"
                    ? "Đang chuyển hướng TikTok..."
                    : "Bắt đầu Kết Nối TikTok (OAuth PKCE)"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Feature Flag Notice */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="font-semibold text-foreground">
                Tính năng TikTok Inbox Draft Upload:
              </span>{" "}
              <span className="text-muted-foreground">
                (Biến môi trường: <code>TIKTOK_DRAFT_UPLOAD_ENABLED</code>)
              </span>
            </div>
          </div>
          <span
            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
              data?.draftUploadEnabled
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            {data?.draftUploadEnabled ? "ENABLED" : "DISABLED (DEFAULT)"}
          </span>
        </div>
      </div>

      {/* INFRASTRUCTURE CARDS */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Hạ Tầng Local-First &amp; AI Engine
        </h3>

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
                Google Gemini API &bull; Model:{" "}
                <code className="font-mono text-foreground font-bold">gemini-3.8-flash</code>
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

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-12 text-center text-xs text-muted-foreground">
          Đang tải trang cài đặt...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
