"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ShieldCheck, Zap, User as UserIcon, Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

interface StatusAccount {
  username: string;
  stage: string;
}

export function TopNav() {
  const router = useRouter();
  const { toggle } = useSidebar();
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState<StatusAccount | null>(null);

  useEffect(() => {
    fetch("/api/tiktok/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "CONNECTED" && data.account) {
          setAccount({
            username: data.account.username,
            stage: data.account.stage || "NEW",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/tiktok/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        // If not connected, redirect user to settings page
        alert(
          data.error ||
            "Chưa kết nối tài khoản TikTok. Đang chuyển hướng tới trang Cài đặt..."
        );
        router.push("/settings?error=tiktok_not_connected");
        return;
      }

      alert(
        `Đồng bộ TikTok thành công! Đã lấy ${data.totalVideosFetched || 0} video và cập nhật snapshot tài khoản.`
      );
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Đồng bộ TikTok thất bại");
      router.push("/settings?error=tiktok_sync_failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Section: Mobile Drawer Toggle & Account Stage Banner */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors -ml-1"
          aria-label="Mở danh mục điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500 shrink-0" />
          <span>STAGE: {account?.stage || "NEW"}</span>
          <span className="hidden sm:inline text-[10px] opacity-75 font-normal">
            (Mục tiêu: 0 - 300 Follower)
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3 font-mono">
          <span>@{account?.username || "tiktok_account"}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>FREE_ONLY</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-md font-mono">
          <span>gemini-3.8-flash</span>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Đang đồng bộ..." : "SYNC NOW"}</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
