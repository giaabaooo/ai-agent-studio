"use client";

import React, { useState, useEffect } from "react";
import {
  FolderHeart,
  Sparkles,
  Flame,
  Film,
  Cloud,
  HardDrive,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Play,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CategoryFilter = "all" | "affiliate_mix" | "tiktok_dance" | "animation_drama";

interface GalleryItem {
  id: string;
  title: string;
  type: "image" | "video";
  category: "affiliate_mix" | "tiktok_dance" | "animation_drama" | "general";
  url: string;
  thumbnailUrl?: string;
  storageProvider: "CLOUDINARY" | "LOCAL";
  cloudinaryPublicId?: string;
  localPath?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function MediaGalleryPage() {
  const { success, error, info } = useToast();
  const router = useRouter();

  // State
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "CLOUDINARY" | "LOCAL">("all");

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  // Cloudinary State (Pre-configured via .env)
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);
  const [cloudName, setCloudName] = useState<string>("dcadn2syh");
  const [isMigratingId, setIsMigratingId] = useState<string | null>(null);

  // Load Gallery Items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (data.success && data.items) {
        setItems(data.items);
      }
    } catch (err: any) {
      error("Không thể tải danh sách Media");
    } finally {
      setLoading(false);
    }
  };

  // Load Cloudinary Config Status
  const fetchCloudinaryStatus = async () => {
    try {
      const res = await fetch("/api/gallery/config");
      const data = await res.json();
      if (data.success && data.config) {
        setIsCloudinaryConfigured(data.config.isConfigured);
        if (data.config.cloudName) setCloudName(data.config.cloudName);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCloudinaryStatus();
  }, []);

  // Filtered Items
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (providerFilter !== "all" && item.storageProvider !== providerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMeta = JSON.stringify(item.metadata || {}).toLowerCase().includes(q);
      if (!matchTitle && !matchMeta) return false;
    }
    return true;
  });

  // Delete Item (Permanently destroys from Cloudinary & system)
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tệp này? Tệp sẽ bị xóa vĩnh viễn khỏi Cloudinary và hệ thống để tránh nặng bộ nhớ.")) return;

    try {
      const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Xóa tệp thất bại");

      setItems((prev) => prev.filter((item) => item.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
      success("Đã xóa tệp vĩnh viễn khỏi Cloudinary thành công!");
    } catch (err: any) {
      error(err.message || "Lỗi khi xóa tệp");
    }
  };

  // Migrate local item to Cloudinary (frees up disk space)
  const handleMigrateToCloud = async (id: string) => {
    try {
      setIsMigratingId(id);
      const res = await fetch("/api/gallery/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Đồng bộ thất bại");

      setItems((prev) =>
        prev.map((item) => (item.id === id ? data.item : item))
      );
      if (previewItem?.id === id) setPreviewItem(data.item);
      success("Đã chuyển tệp lên Cloudinary và giải phóng dung lượng ổ cứng!");
    } catch (err: any) {
      error(err.message || "Lỗi đồng bộ lên đám mây");
    } finally {
      setIsMigratingId(null);
    }
  };

  // Transfer image to TikTok Dance Studio
  const handleUseInDance = (item: GalleryItem) => {
    sessionStorage.setItem(
      "dance_incoming_model",
      JSON.stringify({
        url: item.url,
        relPath: item.localPath || item.url,
      })
    );
    info("Đang đưa Model sang TikTok Dance Studio...");
    router.push(`/tiktok-dance?modelUrl=${encodeURIComponent(item.url)}`);
  };

  // Statistics
  const cloudCount = items.filter((i) => i.storageProvider === "CLOUDINARY").length;
  const localCount = items.filter((i) => i.storageProvider === "LOCAL").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Kho Media &amp; Cloud Vault
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Quản lý tập trung toàn bộ ảnh Affiliate, video TikTok Dance &amp; video kịch bản. Lưu trên Cloudinary tránh nặng máy.
              </p>
            </div>
          </div>
        </div>

        {/* Cloud Config Action */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <Cloud className="w-4 h-4" />
            <span>Cloudinary: {cloudName} (Folder: tiktok-video &bull; Tự động lưu)</span>
          </div>

          <button
            onClick={fetchItems}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics & Storage Info Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số Media
            </p>
            <p className="text-xl font-bold text-foreground">{items.length} tệp</p>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Lưu trên Cloudinary (0% ổ cứng)
            </p>
            <p className="text-xl font-bold text-emerald-400">{cloudCount} tệp</p>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Lưu tạm trên máy
            </p>
            <p className="text-xl font-bold text-amber-400">{localCount} tệp</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            Tất Cả ({items.length})
          </button>

          <button
            onClick={() => setCategoryFilter("affiliate_mix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "affiliate_mix"
                ? "bg-pink-600 text-white shadow-sm"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ảnh Affiliate (Model + SP)</span>
          </button>

          <button
            onClick={() => setCategoryFilter("tiktok_dance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "tiktok_dance"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Video TikTok Dance</span>
          </button>

          <button
            onClick={() => setCategoryFilter("animation_drama")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "animation_drama"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Kịch Bản &amp; Phim</span>
          </button>
        </div>

        {/* Search & Provider Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-secondary/50 border border-border focus:border-primary focus:outline-none w-44"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-secondary/50 border border-border focus:border-primary focus:outline-none"
          >
            <option value="all">Tất cả kho lưu</option>
            <option value="CLOUDINARY">Chỉ Cloudinary</option>
            <option value="LOCAL">Chỉ Trên Máy</option>
          </select>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Đang tải thư viện media...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border/80 rounded-2xl bg-card/30 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary text-muted-foreground mx-auto flex items-center justify-center">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Không có media nào trong mục này</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Bạn có thể tạo ảnh Affiliate mới trong tab Affiliate hoặc tạo video trong tab TikTok Dance.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tới Tab TikTok Affiliate</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
            >
              {/* Media Thumbnail Container */}
              <div
                onClick={() => setPreviewItem(item)}
                className="relative aspect-[9/16] bg-black/60 cursor-pointer overflow-hidden"
              >
                {item.type === "video" ? (
                  <>
                    <video
                      src={item.url}
                      poster={item.thumbnailUrl}
                      preload="metadata"
                      muted
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center ring-2 ring-white/20 group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Badges on Thumbnail */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                  <span
                    className={`px-2 py-0.5 rounded-lg backdrop-blur-md text-[10px] font-bold ${
                      item.category === "affiliate_mix"
                        ? "bg-pink-600/80 text-white"
                        : item.category === "tiktok_dance"
                        ? "bg-orange-600/80 text-white"
                        : "bg-indigo-600/80 text-white"
                    }`}
                  >
                    {item.category === "affiliate_mix"
                      ? "Affiliate"
                      : item.category === "tiktok_dance"
                      ? "TikTok Dance"
                      : "Phim"}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-lg backdrop-blur-md text-[9px] font-bold flex items-center gap-1 ${
                      item.storageProvider === "CLOUDINARY"
                        ? "bg-emerald-600/80 text-white"
                        : "bg-amber-600/80 text-white"
                    }`}
                  >
                    <Cloud className="w-2.5 h-2.5" />
                    <span>{item.storageProvider === "CLOUDINARY" ? "Cloud" : "Local"}</span>
                  </span>
                </div>
              </div>

              {/* Card Meta & Controls */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-border/60 flex flex-col gap-1.5">
                  {/* If image: Allow 1-click use in TikTok Dance */}
                  {item.type === "image" && (
                    <button
                      type="button"
                      onClick={() => handleUseInDance(item)}
                      className="w-full py-1.5 px-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Dùng ảnh này làm người mẫu nhảy trong TikTok Dance Studio"
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>Dùng Làm Model Dance</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-1">
                    {/* Migrate to Cloud if local */}
                    {item.storageProvider === "LOCAL" && (
                      <button
                        type="button"
                        disabled={isMigratingId === item.id}
                        onClick={() => handleMigrateToCloud(item.id)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold flex items-center gap-1"
                        title="Đẩy lên Cloudinary để xóa file trên máy, giải phóng dung lượng"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>{isMigratingId === item.id ? "Đang đẩy..." : "Lên Cloud"}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <a
                        href={item.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Tải về máy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">{previewItem.title}</h3>
                <span className="text-[11px] text-muted-foreground">
                  Lưu trữ: {previewItem.storageProvider}
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-black/40">
              {previewItem.type === "video" ? (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-lg"
                />
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-lg"
                />
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-secondary/20">
              {previewItem.type === "image" && (
                <button
                  type="button"
                  onClick={() => handleUseInDance(previewItem)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  <Flame className="w-4 h-4" />
                  <span>Mang Sang TikTok Dance Làm Video Ngay</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <a
                  href={previewItem.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Về</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(previewItem.id)}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
