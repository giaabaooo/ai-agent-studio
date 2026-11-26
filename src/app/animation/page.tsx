"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Film,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clapperboard,
  ArrowRight,
  Sparkles,
  BookOpen,
  Play,
  RotateCw,
  X,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  seasons: {
    id: string;
    number: number;
    title: string;
    _count: { episodes: number };
  }[];
  characters: {
    id: string;
    name: string;
    role: string;
  }[];
}

interface ImportPreviewData {
  draftId: string;
  series: {
    title: string;
    slug: string;
    subtitle?: string;
    seasonNumber: number;
  };
  charactersCount: number;
  episodesCount: number;
  warningsCount: number;
  warnings: {
    type: string;
    episodeNumber?: number;
    sceneIndex?: number;
    message: string;
    severity: string;
  }[];
  previewEpisodes: {
    number: number;
    title: string;
    targetAge?: string;
    characters: string[];
    scenes: { orderIndex: number; startSec: number; endSec: number; action: string }[];
  }[];
}

export default function AnimationStudioPage() {
  const { success, error, info } = useToast();
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload & Import states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importData, setImportData] = useState<ImportPreviewData | null>(null);

  const fetchSeries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/animation/series");
      const data = await res.json();
      if (data.success) {
        setSeriesList(data.series);
      }
    } catch {
      error("Không thể tải danh sách series");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      error("Vui lòng chọn tệp .docx");
      return;
    }

    try {
      setIsUploading(true);
      info("Đang phân tích kịch bản Word...", "Đang xử lý");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/animation/script-imports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải lên kịch bản thất bại");
      }

      setImportData(data);
      success("Đã phân tích xong bản nháp kịch bản!", "Thành công");
    } catch (err: any) {
      error(err.message || "Tải lên thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    try {
      setIsConfirming(true);
      const res = await fetch(`/api/animation/script-imports/${importData.draftId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: importData.series.title,
          slug: importData.series.slug,
          includeCharacters: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Xác nhận import thất bại");
      }

      success(`Đã tạo thành công series với ${data.importedEpisodesCount} tập!`, "Hoàn tất");
      setIsUploadOpen(false);
      setImportData(null);
      fetchSeries();
    } catch (err: any) {
      error(err.message || "Xác nhận thất bại");
    } finally {
      setIsConfirming(false);
    }
  };

  const totalEpisodes = seriesList.reduce(
    (acc, s) => acc + (s.seasons[0]?._count?.episodes || 0),
    0
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary/20 via-indigo-900/20 to-purple-900/10 border border-primary/20 p-6 sm:p-8 overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold tracking-wide uppercase">
              <Film className="w-3.5 h-3.5" />
              Animation Studio &bull; 9:16 Vertical CGI
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Series Hoạt Hình Thiếu Nhi — Xóm Mít Na
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Quy trình sản xuất hoạt hình dọc: Upload DOCX &rarr; Duyệt kịch bản 30 tập &rarr; Khóa tạo hình Character Bible &rarr; Duyệt ảnh tham chiếu &rarr; Prompt từng cảnh &rarr; Upload raw video &rarr; Render 1080x1920.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Kịch bản (.DOCX)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Series Hoạt hình</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{seriesList.length}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Dự án active</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Tổng số tập</span>
            <Clapperboard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalEpisodes}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Kịch bản đã bóc tách</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Nhân vật chính</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">4</div>
          <p className="text-[11px] text-muted-foreground mt-1">Mít, Na, Bí Bo, Bà Sen</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Định dạng render</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">1080x1920</div>
          <p className="text-[11px] text-muted-foreground mt-1">Khung hình dọc 9:16</p>
        </div>
      </div>

      {/* Series Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Danh Sách Series Hoạt Hình
          </h2>
          <span className="text-xs text-muted-foreground">
            {seriesList.length} series
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Đang tải danh sách series...</p>
          </div>
        ) : seriesList.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
              <Film className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">
                Chưa có series hoạt hình nào
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Hãy upload file kịch bản Word <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">30 tập xóm Mít Na.docx</code> để hệ thống tự động bóc tách 30 tập và nhân vật!
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Kịch Bản DOCX
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {seriesList.map((item) => {
              const epCount = item.seasons[0]?._count?.episodes || 0;
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border bg-card/60 backdrop-blur-md p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                          MÙA 1 &bull; 9:16 CGI
                        </span>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Series 30 tập hoạt hình thiếu nhi 3-8 tuổi. Khóa tạo hình nhân vật Mít, Na, Bí Bo (không thoại người), Bà Sen.
                    </p>

                    {/* Character badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.characters.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-medium"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-border mt-4 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground font-medium">
                      <span className="text-foreground font-bold">{epCount}</span> tập phim
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/animation/series/${item.id}/characters`}
                        className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Character Bible"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Bible</span>
                      </Link>

                      <Link
                        href={`/animation/series/${item.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1 shadow-sm shadow-primary/20"
                      >
                        <span>Xem tập</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DOCX Upload & Preview Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Import Kịch Bản Series (.DOCX)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chấp nhận file Word kịch bản chuẩn Xóm Mít Na (30 tập)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setImportData(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!importData ? (
                /* File Picker Area */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 transition-colors relative cursor-pointer bg-secondary/20">
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />

                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                      {isUploading ? (
                        <RotateCw className="w-8 h-8 animate-spin" />
                      ) : (
                        <FileText className="w-8 h-8" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {isUploading
                          ? "Đang phân tích cú pháp DOCX..."
                          : "Kéo thả hoặc nhấp để chọn file DOCX"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ .docx &bull; Giới hạn tối đa 25MB
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-mono font-medium">
                      /Users/na/Downloads/30 tập xóm Mít Na.docx
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Quy chuẩn bóc tách tự động:
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Tự động nhận diện 30 tập theo tiêu đề <code>TẬP NN. ...</code></li>
                      <li>Phân tích bảng cảnh: thời gian, hành động, thoại, cảm xúc, âm thanh</li>
                      <li>Trích xuất prompt tiếng Anh chuẩn CGI 3D dọc 9:16 cho từng cảnh</li>
                      <li>Khóa 4 nhân vật chuẩn: Mít, Na, Bí Bo (strictly nonverbal), Bà Sen</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Parsed Preview Area */
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-border bg-secondary/30 text-center">
                      <span className="text-[11px] text-muted-foreground">Series</span>
                      <p className="text-base font-bold text-foreground">{importData.series.title}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border bg-secondary/30 text-center">
                      <span className="text-[11px] text-muted-foreground">Tổng số tập</span>
                      <p className="text-base font-bold text-emerald-400">{importData.episodesCount} tập</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border bg-secondary/30 text-center">
                      <span className="text-[11px] text-muted-foreground">Nhân vật</span>
                      <p className="text-base font-bold text-indigo-400">{importData.charactersCount} nhân vật</p>
                    </div>
                  </div>

                  {/* Warnings & Safety Banner */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{importData.warningsCount} Cảnh báo kịch bản được phát hiện (Đã xác minh an toàn)</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Phần lớn cảnh báo là thông báo thời lượng cảnh &gt; 8s (để người dùng lưu ý khi tạo video AI 5-8s). Bí Bo được xác nhận không có thoại tiếng người.
                    </p>
                  </div>

                  {/* Episode preview sample */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Bản xem trước 5 tập đầu tiên:</span>
                      <span className="text-[11px] text-muted-foreground">
                        Hiển thị 5 / {importData.episodesCount} tập
                      </span>
                    </h4>

                    <div className="space-y-2">
                      {importData.previewEpisodes.map((ep) => (
                        <div
                          key={ep.number}
                          className="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                              {ep.number}
                            </span>
                            <div>
                              <span className="font-semibold text-foreground">{ep.title}</span>
                              <p className="text-[11px] text-muted-foreground">
                                {ep.scenes.length} cảnh &bull; Nhân vật: {ep.characters.join(", ")}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] font-medium shrink-0">
                            {ep.scenes.length} cảnh
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
              {importData ? (
                <>
                  <button
                    onClick={() => setImportData(null)}
                    disabled={isConfirming}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Chọn file khác
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isConfirming}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
                  >
                    {isConfirming ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Đang ghi dữ liệu 30 tập...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận Import 30 Tập</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
