"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  PlusCircle,
} from "lucide-react";

interface Creative {
  id: string;
  hook: string;
  hookType: string;
  angle: string;
  durationSec: number;
  contentIntent: string;
  claimGuardStatus: "PASS" | "WARNING" | "BLOCK";
  status: string;
  creator: { name: string; ageStyle: string };
  product: { name: string; category: string };
  _count?: { timelines: number };
}

export default function ContentLabPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [filterCreator, setFilterCreator] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/creatives");
      const data = await res.json();
      if (data.creatives) {
        setCreatives(data.creatives);
      }
    } catch (err) {
      console.error("Lỗi tải creatives:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = creatives.filter((c) => {
    if (filterCreator === "ALL") return true;
    return c.creator.name === filterCreator;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clapperboard className="w-6 h-6 text-primary" />
            <span>Content Lab — Phòng Thí Nghiệm Nội Dung</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Trung tâm quản lý kịch bản, prompt ảnh ChatGPT, video Veo, giọng đọc và hậu kỳ FFmpeg cho TikTok.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary p-1 rounded-xl border border-border">
            <button
              onClick={() => setFilterCreator("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterCreator === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterCreator("LINH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterCreator === "LINH"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LINH
            </button>
            <button
              onClick={() => setFilterCreator("NAM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterCreator === "NAM"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NAM
            </button>
          </div>

          <Link
            href="/products/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tạo Kịch Bản Mới</span>
          </Link>
        </div>
      </div>

      {/* Creatives Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Đang tải danh sách kịch bản...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40">
          <Clapperboard className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm font-semibold mb-1">Chưa có kịch bản nào trong Content Lab</p>
          <p className="text-xs text-muted-foreground mb-4">
            Chọn sản phẩm và kích hoạt &quot;Sinh 3 Concept Kịch Bản&quot; để bắt đầu quy trình tạo video.
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <span>Thêm sản phẩm để tạo kịch bản</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const isBlocked = c.claimGuardStatus === "BLOCK";
            const isWarning = c.claimGuardStatus === "WARNING";

            return (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{c.creator.name}</span>
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                        isBlocked
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}
                    >
                      {isBlocked ? (
                        <ShieldAlert className="w-3 h-3" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                      <span>{c.claimGuardStatus}</span>
                    </span>
                  </div>

                  {/* Hook Text */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                      {c.hookType} &bull; {c.durationSec}s &bull; {c.contentIntent}
                    </span>
                    <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                      &quot;{c.hook}&quot;
                    </h4>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1 mb-4">
                    Góc quay: <span className="text-foreground">{c.angle}</span>
                  </p>

                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="truncate max-w-[200px]">SP: {c.product.name}</span>
                    <span className="shrink-0 font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                      {c.status}
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>12 giây TikTok UGC</span>
                  </span>

                  <Link
                    href={`/content/${c.id}`}
                    className="font-bold text-xs text-primary hover:text-primary/80 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Mở Studio Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
