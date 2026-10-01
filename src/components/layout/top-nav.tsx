"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck, Zap, User as UserIcon } from "lucide-react";

export function TopNav() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 1000);
  };

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Account Stage Banner */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
          <span>STAGE: NEW</span>
          <span className="text-[10px] opacity-75 font-normal">
            (Mục tiêu: 0 - 300 Follower)
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3 font-mono">
          <span>@affiliate_ai_studio</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Đang đồng bộ..." : "SYNC NOW"}</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
