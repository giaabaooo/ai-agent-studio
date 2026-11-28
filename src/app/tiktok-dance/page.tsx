"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Sparkles,
  UploadCloud,
  Film,
  Download,
  Play,
  RotateCw,
  Music,
  CheckCircle2,
  Trash2,
  Maximize2,
  Eye,
  Sliders,
  Layers,
  HelpCircle,
  Video,
  Key,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface DancePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  icon: string;
}

const PRESET_OPTIONS: DancePreset[] = [
  {
    id: "hip_sway",
    name: "Lắc Hông Quyến Rũ (K-Pop Beat)",
    category: "Dance Trend",
    badge: "Hot Trend",
    icon: "💃",
    description: "Nhún nhảy uyển chuyển, lắc hông nhẹ nhàng sang hai bên theo nhịp nhạc, mỉm cười ngọt ngào nhìn camera.",
  },
  {
    id: "boutique_spin",
    name: "Xoay Người Tạo Dáng Thời Trang (Boutique)",
    category: "Thời Trang / Try-on",
    badge: "Boutique Look",
    icon: "👗",
    description: "Xoay nhẹ 360 độ khoe trọn vóc dáng và đầm bodycon, vuốt nhẹ lọn tóc, bước lại gần camera tự tin.",
  },
  {
    id: "cute_bounce",
    name: "Nhún Nhảy Vũ Đạo Tay Dễ Thương (Cute Dance)",
    category: "Viral Dễ Thương",
    badge: "Viral Shorts",
    icon: "🎀",
    description: "Nhún chân nhịp nhàng, làm động tác tay nhí nhảnh bắt trend (bắn tim, chỉ tay), biểu cảm vui tươi hút view.",
  },
  {
    id: "catwalk_strut",
    name: "Dáng Đi Catwalk Kiêu Sa & Hất Tóc",
    category: "Sang Chảnh",
    badge: "Glamour",
    icon: "👠",
    description: "Bước đi chậm rãi kiêu kỳ về phía camera, hất nhẹ mái tóc bồng bềnh, dừng lại tạo dáng sang chảnh.",
  },
];

interface GeneratedVideo {
  id: string;
  videoUrl: string;
  localPath: string;
  characterImage: string;
  mode: string;
  presetId: string;
  duration: number;
  createdAt: string;
}

export default function TikTokDanceStudioPage() {
  const { success, error, info } = useToast();

  // Character Model State
  const [characterImage, setCharacterImage] = useState<string>(
    "/api/media/file/tiktok-dance/characters/default_model.png"
  );
  const [characterRelPath, setCharacterRelPath] = useState<string>(
    "tiktok-dance/characters/default_model.png"
  );
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  // Generation Mode
  const [mode, setMode] = useState<"preset" | "reference_video">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("hip_sway");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [duration, setDuration] = useState<string>("10");

  // Reference Video State (Mode 2)
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [referenceVideoRelPath, setReferenceVideoRelPath] = useState<string | null>(null);
  const [isUploadingRefVideo, setIsUploadingRefVideo] = useState(false);
  const refVideoInputRef = useRef<HTMLInputElement>(null);

  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioRelPath, setAudioRelPath] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Execution States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<{
    jobId: string;
    status: string;
    queuePosition: number;
    startTime: number;
    elapsedSeconds: number;
    durationLabel: string;
  } | null>(null);

  // Timer for active job
  useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(() => {
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000),
            }
          : null
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJob?.jobId]);

  // Fal API Key Configuration
  const [falKey, setFalKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Load history & saved Fal key on mount
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/tiktok-dance/history");
      const data = await res.json();
      if (data.success && data.history) {
        setHistory(data.history);
        if (data.history.length > 0 && !currentVideo) {
          setCurrentVideo(data.history[0]);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchHistory();
    const savedKey = localStorage.getItem("fal_api_key");
    if (savedKey) setFalKey(savedKey);

    // Check for incoming model from TikTok Affiliate or Gallery
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const incomingModelUrl = params.get("modelUrl");
      const incomingRelPath = params.get("relPath");
      const sessionModel = sessionStorage.getItem("dance_incoming_model");

      if (incomingModelUrl) {
        setCharacterImage(incomingModelUrl);
        setCharacterRelPath(incomingRelPath || incomingModelUrl);
        info("Đã nhận ảnh Model từ TikTok Affiliate Studio!");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (sessionModel) {
        try {
          const parsed = JSON.parse(sessionModel);
          if (parsed.url) {
            setCharacterImage(parsed.url);
            setCharacterRelPath(parsed.relPath || parsed.url);
            info("Đã nhận ảnh Model từ TikTok Affiliate Studio!");
            sessionStorage.removeItem("dance_incoming_model");
          }
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  // Upload Character Handler
  const handleUploadCharacter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingModel(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "character");

      const res = await fetch("/api/tiktok-dance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Tải ảnh thất bại");

      setCharacterImage(data.url);
      setCharacterRelPath(data.localPath);
      success("Đã cập nhật ảnh Model nhân vật thành công!");
    } catch (err: any) {
      error(err.message || "Lỗi khi tải ảnh");
    } finally {
      setIsUploadingModel(false);
      if (modelFileInputRef.current) modelFileInputRef.current.value = "";
    }
  };

  // Upload Reference Video Handler
  const handleUploadRefVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingRefVideo(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "reference_video");

      const res = await fetch("/api/tiktok-dance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Tải video mẫu thất bại");

      setReferenceVideoUrl(data.url);
      setReferenceVideoRelPath(data.localPath);
      setMode("reference_video");
      success("Đã nạp video TikTok mẫu thành công! AI sẽ copy điệu nhảy từ video này.");
    } catch (err: any) {
      error(err.message || "Lỗi tải video mẫu");
    } finally {
      setIsUploadingRefVideo(false);
      if (refVideoInputRef.current) refVideoInputRef.current.value = "";
    }
  };

  // Upload Audio Handler
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAudio(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "audio");

      const res = await fetch("/api/tiktok-dance/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Tải âm thanh thất bại");

      setAudioUrl(data.url);
      setAudioRelPath(data.localPath);
      success("Đã chọn file nhạc trend!");
    } catch (err: any) {
      error(err.message || "Lỗi tải âm thanh");
    } finally {
      setIsUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  // Main Generate Handler
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setLastError(null);
      info(
        mode === "reference_video"
          ? "Đang nạp video mẫu và gửi tác vụ tới cụm máy chủ Kling AI..."
          : "Đang gửi tác vụ tạo video nhảy TikTok 9:16 tới Kling AI...",
        "Khởi tạo tác vụ"
      );

      const res = await fetch("/api/tiktok-dance/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterImageRelPath: characterRelPath,
          mode,
          presetId: selectedPresetId,
          customPrompt,
          referenceVideoRelPath: referenceVideoRelPath,
          audioRelPath: audioRelPath,
          duration,
          falKey: falKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.job?.jobId) {
        throw new Error(data.error || "Tạo video thất bại");
      }

      const jobId = data.job.jobId;
      const targetDuration = data.job.duration;
      setActiveJob({
        jobId,
        status: "IN_QUEUE",
        queuePosition: 0,
        startTime: Date.now(),
        elapsedSeconds: 0,
        durationLabel: String(targetDuration),
      });

      // Polling status loop: up to 250 attempts * 3.5s = ~875s (approx 14.5 minutes)
      let isDone = false;
      let finalVideo: GeneratedVideo | null = null;
      let attempts = 0;
      const maxAttempts = 250;

      while (!isDone && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3500));
        attempts++;

        try {
          const statusRes = await fetch(
            `/api/tiktok-dance/status?jobId=${jobId}&falKey=${encodeURIComponent(falKey.trim())}`
          );
          const statusJson = await statusRes.json();

          if (!statusRes.ok || !statusJson.success) {
            throw new Error(statusJson.error || "Lỗi kiểm tra trạng thái video");
          }

          if (statusJson.isCompleted) {
            if (statusJson.video) {
              finalVideo = statusJson.video;
              isDone = true;
              break;
            } else if (statusJson.error) {
              throw new Error(statusJson.error);
            }
          } else {
            setActiveJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: statusJson.status || "IN_PROGRESS",
                    queuePosition: statusJson.queuePosition || 0,
                    elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000),
                  }
                : null
            );
          }
        } catch (pollErr: any) {
          console.warn("Lỗi poll status:", pollErr.message);
        }
      }

      if (!finalVideo) {
        throw new Error("Quá thời gian xử lý (timeout sau 14 phút). Vui lòng thử lại hoặc giảm thời lượng.");
      }

      success("Đã tạo video nhảy TikTok thành công! Khung hình sạch 100%.", "Hoàn tất");
      setCurrentVideo(finalVideo);
      await fetchHistory();
    } catch (err: any) {
      setLastError(err.message || "Lỗi khi tạo video TikTok Dance");
      error(err.message || "Lỗi khi tạo video TikTok Dance");
    } finally {
      setIsGenerating(false);
      setActiveJob(null);
    }
  };

  // Download video handler (supports cross-origin Cloudinary URLs via Blob download)
  const handleDownloadVideo = async (video: GeneratedVideo) => {
    if (isDownloading) return;
    setIsDownloading(true);
    const filename = `tiktok_dance_${video.id}.mp4`;

    try {
      const res = await fetch(video.videoUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      success("Đang lưu video MP4 về máy...");
    } catch {
      const cloudinaryDownloadUrl = video.videoUrl.includes("res.cloudinary.com") &&
        video.videoUrl.includes("/upload/")
        ? video.videoUrl.replace("/upload/", `/upload/fl_attachment:${filename.replace(/\.mp4$/, "")}/`)
        : video.videoUrl;
      window.open(cloudinaryDownloadUrl, "_blank", "noopener,noreferrer");
      info("Đã mở link tải video ở tab mới.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Delete video handler
  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa video này khỏi danh sách?")) return;
    try {
      await fetch(`/api/tiktok-dance/history?id=${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((v) => v.id !== id));
      if (currentVideo?.id === id) {
        setCurrentVideo(history.find((v) => v.id !== id) || null);
      }
      success("Đã xóa video");
    } catch {
      error("Lỗi xóa video");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden File Inputs */}
      <input
        ref={modelFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadCharacter}
      />
      <input
        ref={refVideoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleUploadRefVideo}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUploadAudio}
      />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/20 backdrop-blur-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                <Flame className="w-5 h-5 fill-pink-500/30" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                TikTok Dance & Fashion Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider">
                Kling AI Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Biến ảnh tĩnh thành video hot girl nhảy trend & thời trang boutique 9:16 siêu thực.{" "}
              <strong className="text-pink-400">Cam kết 100% khung hình sạch</strong> (không dính ID TikTok, không logo, không watermark).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{falKey ? "API Key: Đã Nhập" : "🔑 Cấu Hình FAL_KEY"}</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-secondary/60 border border-border text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">Kling Video API:</span>
              <span className="font-bold text-foreground">Sẵn Sàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Model Setup & Dance Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Character Model Card */}
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                1. Ảnh Model Nhân Vật Chính
              </h3>
              <button
                onClick={() => modelFileInputRef.current?.click()}
                disabled={isUploadingModel || isGenerating}
                className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs font-semibold border border-pink-500/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {isUploadingModel ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>Thay Ảnh Khác</span>
              </button>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-black/30 border border-border/60">
              <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-pink-500/40 shadow-md shrink-0 bg-black">
                <img
                  src={characterImage}
                  alt="Model"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-pink-500 text-white">
                  9:16
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  Hot Girl Model (Đầm Đen Cúp Ngực)
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Model đã được khóa chuẩn khuôn mặt, vóc dáng và bối cảnh phòng ngủ sang trọng. AI sẽ giữ trọn vẹn visual quyến rũ này khi tạo chuyển động.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Motion Mode Switcher */}
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                2. Chọn Cách Cử Động Vũ Đạo
              </h3>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-border">
              <button
                onClick={() => setMode("preset")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "preset"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>💃 Điệu Cử Động Có Sẵn</span>
              </button>
              <button
                onClick={() => setMode("reference_video")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "reference_video"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🎬 Copy Video TikTok Mẫu</span>
              </button>
            </div>

            {/* Mode A: Preset Motion Cards */}
            {mode === "preset" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_OPTIONS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-pink-500 bg-pink-500/10 shadow-md ring-1 ring-pink-500/40"
                            : "border-border bg-secondary/40 hover:bg-secondary/70"
                        } space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{preset.icon}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            {preset.badge}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{preset.name}</h4>
                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Prompt Toggle */}
                <div className="pt-2">
                  <details className="text-xs text-muted-foreground group">
                    <summary className="cursor-pointer font-semibold text-foreground hover:text-pink-400 transition-colors flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Tùy chỉnh Prompt mô tả chi tiết (Tùy chọn)</span>
                    </summary>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Nhập mô tả cử động bạn muốn (hoặc để trống để AI dùng mẫu tối ưu sẵn)..."
                      className="mt-2 w-full h-20 p-2.5 rounded-xl bg-black/40 border border-border text-foreground text-xs focus:outline-none focus:border-pink-500"
                    />
                  </details>
                </div>
              </div>
            )}

            {/* Mode B: Reference Video Upload */}
            {mode === "reference_video" && (
              <div className="space-y-3 pt-1">
                <div
                  onClick={() => refVideoInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/40 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-purple-500/5 hover:bg-purple-500/10 space-y-2.5"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto">
                    {isUploadingRefVideo ? (
                      <RotateCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Video className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                      {referenceVideoUrl ? "Đã chọn video mẫu. Bấm để đổi video khác" : "Bấm để chọn video nhảy TikTok mẫu"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Hỗ trợ MP4, MOV dọc 9:16 (độ dài lý tưởng 5 – 10 giây)
                    </p>
                  </div>
                </div>

                {referenceVideoUrl && (
                  <div className="p-3 rounded-xl bg-black/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs">
                      <Film className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-foreground truncate max-w-xs">
                        Video TikTok Mẫu Đang Dùng
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setReferenceVideoUrl(null);
                        setReferenceVideoRelPath(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Duration & Audio Settings */}
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Music className="w-4 h-4 text-indigo-400" />
              3. Thời Lượng & Âm Thanh / Nhạc Trend
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Duration selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Thời Lượng Video:</span>
                  <span className="text-[10px] text-pink-400">
                    {mode === "reference_video" ? "Tối đa 30s" : "Chuẩn 5-10s"}
                  </span>
                </label>

                {mode === "reference_video" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => setDuration("auto")}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          duration === "auto"
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                        title="Render trọn vẹn theo video mẫu (lên đến 30 giây)"
                      >
                        Tự động (Full)
                      </button>
                      <button
                        onClick={() => setDuration("10")}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          duration === "10"
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        10 Giây
                      </button>
                      <button
                        onClick={() => setDuration("15")}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          duration === "15"
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        15 Giây
                      </button>
                      <button
                        onClick={() => setDuration("20")}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          duration === "20"
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        20 Giây
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      💡 <strong>Tự động cắt (Trim)</strong>: Nếu video mẫu dài hơn thời gian chọn (ví dụ video 20s mà bạn chọn 15s), hệ thống sẽ tự động cắt 15s đầu của điệu nhảy và bài nhạc.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDuration("5")}
                      className={`py-2 px-3 rounded-xl border font-bold transition-all ${
                        duration === "5"
                          ? "border-pink-500 bg-pink-500/15 text-pink-300"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      5 Giây (Nhanh)
                    </button>
                    <button
                      onClick={() => setDuration("10")}
                      className={`py-2 px-3 rounded-xl border font-bold transition-all ${
                        duration === "10"
                          ? "border-pink-500 bg-pink-500/15 text-pink-300"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      10 Giây (Chuẩn Trend)
                    </button>
                  </div>
                )}
              </div>

              {/* Music upload */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Nhạc Nền Trend (Tùy chọn):</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploadingAudio || isGenerating}
                    className="flex-1 py-2 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-500 text-indigo-300 font-semibold flex items-center justify-center gap-1.5 transition-colors bg-indigo-500/5 hover:bg-indigo-500/10"
                  >
                    {isUploadingAudio ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Music className="w-3.5 h-3.5" />
                    )}
                    <span>{audioUrl ? "Đổi Nhạc MP3" : "Chọn Nhạc MP3"}</span>
                  </button>
                  {audioUrl && (
                    <button
                      onClick={() => {
                        setAudioUrl(null);
                        setAudioRelPath(null);
                      }}
                      className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      title="Gỡ nhạc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground leading-tight p-2 rounded-lg bg-black/30 border border-border/60">
                  {audioUrl ? (
                    <p className="text-emerald-400 font-medium">
                      🎵 Đã chọn MP3 riêng: Sẽ ghép đè nhạc này vào video thành phẩm.
                    </p>
                  ) : mode === "reference_video" ? (
                    <p className="text-purple-300">
                      ✨ <strong>Không cần up MP3</strong>: Video xuất ra sẽ tự động lấy bài nhạc gốc từ video TikTok mẫu đã tải lên!
                    </p>
                  ) : (
                    <p>
                      Mẹo: Có thể để trống nếu bạn muốn tự ghép nhạc sau trên app TikTok.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner if any */}
          {lastError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200">Thông báo từ máy chủ / Kling AI:</p>
                  <p className="leading-relaxed text-[11px] text-rose-300">{lastError}</p>
                </div>
              </div>
              {(lastError.includes("Exhausted balance") ||
                lastError.includes("số dư") ||
                lastError.includes("FAL_KEY") ||
                lastError.includes("locked")) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
                  <a
                    href="https://fal.ai/dashboard/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Nạp tiền tại Fal.ai Billing</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/25 hover:bg-purple-500/35 text-purple-200 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Key className="w-3 h-3" />
                    <span>Đổi FAL_KEY Mới</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Job Live Progress */}
          {activeJob && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-black/60 border border-purple-500/40 space-y-3.5 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Kling AI Đang Dựng Video ({activeJob.durationLabel}s)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {Math.floor(activeJob.elapsedSeconds / 60)}m {activeJob.elapsedSeconds % 60}s
                    </span>
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-pink-400">
                  {activeJob.status === "IN_QUEUE"
                    ? `Hàng đợi #${activeJob.queuePosition || 1}`
                    : "GPU đang dựng hình"}
                </span>
              </div>

              {/* Stage indicators */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-black/40 border border-purple-500/30 text-purple-300 font-medium text-center">
                  1. Nạp video mẫu ✓
                </div>
                <div
                  className={`p-2 rounded-xl border text-center font-medium ${
                    activeJob.status === "IN_QUEUE"
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300 animate-pulse font-bold"
                      : "border-purple-500/30 bg-black/40 text-purple-300"
                  }`}
                >
                  2. Xếp hàng GPU
                </div>
                <div
                  className={`p-2 rounded-xl border text-center font-medium ${
                    activeJob.status === "IN_PROGRESS"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 animate-pulse font-bold"
                      : "border-border/40 bg-black/20 text-muted-foreground"
                  }`}
                >
                  3. Dựng chuyển động & Nhạc
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {activeJob.status === "IN_QUEUE"
                  ? "Máy chủ Fal.ai đang cấp GPU để chạy tác vụ. Bạn sẽ thấy chuyển sang bước 3 ngay khi máy chủ nhận lệnh."
                  : "Kling AI đang quét khung xương và sinh từng khung hình 9:16 siêu thực. Quá trình này thường mất 3 - 6 phút cho video 15 giây. Hệ thống sẽ tự động ghép âm thanh gốc khi xong!"}
              </p>
            </div>
          )}

          {/* Big Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RotateCw className="w-5 h-5 animate-spin" />
                <span>
                  {activeJob
                    ? `Đang Dựng Video (${Math.floor(activeJob.elapsedSeconds / 60)}m ${activeJob.elapsedSeconds % 60}s)...`
                    : "Đang Khởi Tạo Tác Vụ..."}
                </span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 fill-white" />
                <span>TẠO VIDEO NHẢY TIKTOK NGAY (KLING AI)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Video Output & History (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Video Player */}
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Film className="w-4 h-4 text-pink-400" />
                Video Xuất Bản (9:16)
              </h3>
              {currentVideo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SẠCH 100% KHÔNG LOGO
                </span>
              )}
            </div>

            {currentVideo ? (
              <div className="space-y-3">
                <div className="relative group w-full aspect-[9/16] max-h-[460px] bg-black rounded-xl overflow-hidden border border-border shadow-lg mx-auto">
                  <video
                    src={currentVideo.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setFullscreenVideoUrl(currentVideo.videoUrl)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-pink-500 text-white text-xs flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-all shadow-md backdrop-blur-sm"
                    title="Xem phóng to"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadVideo(currentVideo)}
                    disabled={isDownloading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-center disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Đang Tải Video...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Tải Video MP4 Về Máy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(currentVideo.id)}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-border transition-colors"
                    title="Xóa video này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-[9/16] max-h-[460px] rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2 bg-black/20">
                <Film className="w-8 h-8 opacity-40 text-pink-400" />
                <p className="text-xs font-semibold">Chưa có video nào được tạo</p>
                <p className="text-[11px] max-w-xs">
                  Bấm nút "TẠO VIDEO NHẢY TIKTOK NGAY" ở cột bên trái để bắt đầu render video đầu tiên!
                </p>
              </div>
            )}
          </div>

          {/* History Gallery */}
          {history.length > 0 && (
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Lịch Sử Video Đã Tạo ({history.length})</span>
              </h4>

              <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentVideo(item)}
                    className={`relative group aspect-[9/16] rounded-lg overflow-hidden border cursor-pointer transition-all ${
                      currentVideo?.id === item.id
                        ? "border-pink-500 ring-2 ring-pink-500/50"
                        : "border-border hover:border-pink-400/60"
                    } bg-black`}
                  >
                    <video
                      src={item.videoUrl}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {fullscreenVideoUrl && (
        <div
          onClick={() => setFullscreenVideoUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-border shadow-2xl"
          >
            <video
              src={fullscreenVideoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setFullscreenVideoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-white text-white hover:text-black transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* FAL_KEY Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                Cấu Hình FAL_KEY (Fal.ai API)
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Kling AI Motion Control được gọi qua nền tảng Fal.ai. Nếu tài khoản hiện tại hết credit hoặc bạn có key mới, bạn có thể dán trực tiếp vào đây.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">FAL_KEY của bạn:</label>
              <input
                type="password"
                value={falKey}
                onChange={(e) => setFalKey(e.target.value)}
                placeholder="fal_sk_..."
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <a
                href="https://fal.ai/dashboard/billing"
                target="_blank"
                rel="noreferrer"
                className="text-pink-400 hover:text-pink-300 underline flex items-center gap-1 text-[11px]"
              >
                Kiểm tra số dư Fal.ai Billing <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => {
                  localStorage.setItem("fal_api_key", falKey.trim());
                  setShowKeyModal(false);
                  success("Đã lưu FAL_KEY vào trình duyệt!");
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90"
              >
                Lưu Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
