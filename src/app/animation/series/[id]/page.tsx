"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Film,
  BookOpen,
  Clapperboard,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCw,
  Search,
  Filter,
  Sparkles,
  Play,
  Layers,
  ArrowLeft,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  logline?: string | null;
  summary?: string | null;
  targetDurationSec: number;
  status: string;
  metadata?: any;
  _count: {
    scenes: number;
    renders: number;
  };
}

interface SeriesDetails {
  id: string;
  title: string;
  slug: string;
  status: string;
  styleGuide?: any;
  safetyRules?: any;
  seasons: {
    id: string;
    number: number;
    title: string;
    episodes: EpisodeItem[];
  }[];
  characters: {
    id: string;
    name: string;
    role: string;
    referenceAssets: { id: string; approved: boolean }[];
  }[];
}

export default function SeriesDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { error } = useToast();
  const [series, setSeries] = useState<SeriesDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchSeries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/animation/series/${id}`);
      const data = await res.json();
      if (data.success) {
        setSeries(data.series);
      } else {
        error(data.error || "Không thể tải series");
      }
    } catch {
      error("Lỗi kết nối khi tải series");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm font-medium">Đang tải chi tiết series...</p>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Không tìm thấy series</h2>
        <Link
          href="/animation"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-semibold hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Về danh sách Series
        </Link>
      </div>
    );
  }

  const episodes = series.seasons[0]?.episodes || [];

  const filteredEpisodes = episodes.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.number.toString().includes(searchTerm) ||
      (ep.logline && ep.logline.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || ep.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/animation" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Film className="w-3.5 h-3.5" />
          <span>Animation Studio</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{series.title}</span>
      </div>

      {/* Series Hero Card */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                MÙA 1 &bull; 30 TẬP
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {series.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {series.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Series hoạt hình 3D CGI dọc 1080x1920 cho thiếu nhi. Bối cảnh Ngôi nhà Nắng, tông màu ấm pastel, bài học kỹ năng và cảm xúc đời sống gần gũi.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/animation/series/${series.id}/characters`}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-2 border border-border transition-colors shadow-sm"
            >
              <Users className="w-4 h-4 text-primary" />
              <span>Character Bible ({series.characters.length})</span>
            </Link>
          </div>
        </div>

        {/* Character Quick Bar */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Nhân vật khóa:
          </span>
          {series.characters.map((c) => {
            const approvedCount = c.referenceAssets.filter((a) => a.approved).length;
            return (
              <Link
                key={c.id}
                href={`/animation/series/${series.id}/characters`}
                className="px-2.5 py-1 rounded-lg bg-secondary/70 hover:bg-secondary text-xs flex items-center gap-2 transition-colors border border-border/50"
              >
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  approvedCount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {approvedCount > 0 ? `${approvedCount} ref` : "Chưa duyệt ref"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Episode Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo số tập, tên hoặc logline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "STORYBOARD_READY", "ASSETS_PENDING", "RENDERED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL"
                ? "Tất cả (30)"
                : status === "STORYBOARD_READY"
                ? "Kịch bản sẵn sàng"
                : status === "ASSETS_PENDING"
                ? "Chờ Asset"
                : "Đã Render"}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEpisodes.map((ep) => (
          <div
            key={ep.id}
            className="group rounded-2xl border border-border bg-card/60 backdrop-blur-md p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {String(ep.number).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {ep.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ep.targetDurationSec}s
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clapperboard className="w-3 h-3" />
                        {ep._count.scenes} cảnh
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  ep.status === "RENDERED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  {ep.status === "RENDERED" ? "Rendered" : "Storyboard"}
                </span>
              </div>

              {ep.logline && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-secondary/30 p-2.5 rounded-xl border border-border/40">
                  {ep.logline}
                </p>
              )}

              {/* Character chips */}
              {ep.metadata?.characters && (
                <div className="flex flex-wrap gap-1">
                  {ep.metadata.characters.map((cName: string) => (
                    <span
                      key={cName}
                      className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium"
                    >
                      {cName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border mt-4 flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                {ep._count.renders > 0 ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {ep._count.renders} bản render
                  </span>
                ) : (
                  <span>Chưa render bản final</span>
                )}
              </div>

              <Link
                href={`/animation/episodes/${ep.id}`}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
              >
                <span>Mở Storyboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
