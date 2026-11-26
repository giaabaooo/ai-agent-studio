"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Film,
  Play,
  Copy,
  Check,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RotateCw,
  ArrowLeft,
  Volume2,
  FileVideo,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  VolumeX,
  Eye,
  Maximize2,
  ImagePlus,
  Trash2,
  Mic,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AnimationAssetType } from "@prisma/client";

interface SceneAsset {
  id: string;
  assetType: AnimationAssetType;
  localPath: string;
  version: number;
  approved: boolean;
  fileSize: number;
  mimeType: string;
  metadata?: any;
}

interface SceneItem {
  id: string;
  orderIndex: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  setting: string;
  action: string;
  dialogue?: string | null;
  emotionDirection?: string | null;
  soundDirection?: string | null;
  visualPrompt: string;
  negativePrompt: string;
  continuityNotes?: string | null;
  status: string;
  assets: SceneAsset[];
}

interface EpisodeDetails {
  id: string;
  number: number;
  title: string;
  logline?: string | null;
  summary?: string | null;
  targetDurationSec: number;
  status: string;
  season: {
    id: string;
    number: number;
    title: string;
    series: {
      id: string;
      title: string;
      slug: string;
    };
  };
  scenes: SceneItem[];
  renders: {
    id: string;
    localPath: string;
    version: number;
    active: boolean;
    status: string;
    createdAt: string;
    metadata?: any;
  }[];
}

export default function EpisodeProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { success, error, info } = useToast();
  const [episode, setEpisode] = useState<EpisodeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded prompt views
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Asset upload modal
  const [activeSceneForUpload, setActiveSceneForUpload] = useState<SceneItem | null>(null);
  const [uploadAssetType, setUploadAssetType] = useState<AnimationAssetType>(
    AnimationAssetType.RAW_VIDEO
  );
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  // Render modal & status
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderPreflight, setRenderPreflight] = useState<{
    canRender: boolean;
    issues: string[];
    missingVideoSceneIndices: number[];
    missingApprovedVideoScenes: number[];
  } | null>(null);

  // High-res media preview modal
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: "IMAGE" | "VIDEO";
    title: string;
  } | null>(null);

  const fetchEpisode = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/animation/episodes/${id}`);
      const data = await res.json();
      if (data.success) {
        setEpisode(data.episode);
      } else {
        error(data.error || "Không thể tải tập phim");
      }
    } catch {
      error("Lỗi kết nối khi tải tập phim");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisode();
    fetchFullPrompt();
  }, [id]);

  const togglePromptExpand = (sceneId: string) => {
    setExpandedPrompts((prev) => ({ ...prev, [sceneId]: !prev[sceneId] }));
  };

  const handleCopyPrompt = async (sceneId: string, type: "IMAGE" | "VIDEO") => {
    try {
      const res = await fetch(`/api/animation/scenes/${sceneId}/prompt-bundle`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo prompt bundle");

      const text = type === "IMAGE" ? data.bundle.imagePrompt : data.bundle.videoPrompt;
      navigator.clipboard.writeText(text);

      const copyId = `${sceneId}-${type}`;
      setCopiedKey(copyId);
      success(
        `Đã copy ${type === "IMAGE" ? "Prompt Ảnh" : "Prompt Video"} chuẩn Character Lock!`,
        "Đã sao chép"
      );
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err: any) {
      error(err.message || "Không thể copy prompt");
    }
  };

  const handleUploadSceneAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSceneForUpload) return;

    try {
      setIsUploadingAsset(true);
      info("Đang tải lên asset cảnh...", "Đang xử lý");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", uploadAssetType);

      const res = await fetch(`/api/animation/scenes/${activeSceneForUpload.id}/assets`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tải lên asset thất bại");

      success("Tải lên asset thành công!");
      setActiveSceneForUpload(null);
      fetchEpisode();
    } catch (err: any) {
      error(err.message || "Tải lên thất bại");
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const handleToggleSceneAssetApproval = async (assetId: string, currentApproved: boolean) => {
    try {
      const res = await fetch(`/api/animation/scene-assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !currentApproved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");

      success(
        !currentApproved ? "Đã duyệt video cảnh (APPROVED)!" : "Đã hủy duyệt video"
      );
      fetchEpisode();
    } catch (err: any) {
      error(err.message || "Thao tác thất bại");
    }
  };

  const handleOpenRenderModal = async () => {
    try {
      const res = await fetch(`/api/animation/episodes/${id}/render-preflight`);
      const data = await res.json();
      if (data.success) {
        setRenderPreflight(data.preflight);
        setIsRenderModalOpen(true);
      }
    } catch {
      error("Không thể kiểm tra điều kiện render");
    }
  };

  // Full episode AI video & upload states (No popup modals, directly on the page)
  const [selectedRenderId, setSelectedRenderId] = useState<string | null>(null);
  const [fullPrompt, setFullPrompt] = useState<string>("");
  const [copiedFullPrompt, setCopiedFullPrompt] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiErrorDetails, setAiErrorDetails] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [isUploadingFullVideo, setIsUploadingFullVideo] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const fullVideoFileInputRef = useRef<HTMLInputElement>(null);

  const fetchFullPrompt = async () => {
    try {
      const res = await fetch(`/api/animation/episodes/${id}/full-prompt`);
      const data = await res.json();
      if (data.success && data.promptBundle) {
        setFullPrompt(data.promptBundle.masterEpisodePrompt);
      }
    } catch {
      // Ignore
    }
  };

  const handleCopyFullPrompt = () => {
    if (!fullPrompt) return;
    navigator.clipboard.writeText(fullPrompt);
    setCopiedFullPrompt(true);
    success("Đã sao chép Master Prompt toàn tập vào Clipboard!");
    setTimeout(() => setCopiedFullPrompt(false), 2500);
  };

  const [selectedProvider, setSelectedProvider] = useState<"fal" | "google">("fal");
  const [falBillingUrl, setFalBillingUrl] = useState<string | null>(null);
  const [isGeneratingKeyframes, setIsGeneratingKeyframes] = useState(false);

  const handleGenerateKeyframes = async (sceneId?: string) => {
    try {
      setIsGeneratingKeyframes(true);
      info(
        sceneId
          ? "Đang dùng Google Gemini sinh ảnh Keyframe 3D Pixar chuẩn 9:16 đồng bộ cho cảnh này..."
          : "Đang dùng Google Gemini sinh 4 ảnh Keyframe 3D Pixar chuẩn 9:16 đồng bộ cho cả tập phim...",
        "Đang xử lý"
      );

      const res = await fetch(`/api/animation/episodes/${id}/generate-keyframes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId, forceRegenerate: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tạo keyframe thất bại");
      }

      success(data.message || "Đã tạo ảnh Keyframe thành công!", "Hoàn tất");
      await fetchEpisode();
    } catch (err: any) {
      error(err.message || "Lỗi khi sinh ảnh keyframe");
    } finally {
      setIsGeneratingKeyframes(false);
    }
  };

  const [isGeneratingVoices, setIsGeneratingVoices] = useState(false);

  const handleGenerateVoices = async (sceneId?: string) => {
    try {
      setIsGeneratingVoices(true);
      info(
        sceneId
          ? "Đang dùng Gemini Voice AI sinh giọng lồng tiếng cho nhân vật trong cảnh này..."
          : "Đang sinh giọng lồng tiếng AI (Gemini TTS) cho tất cả nhân vật trong 4 cảnh...",
        "Đang xử lý"
      );

      const res = await fetch(`/api/animation/episodes/${id}/generate-voices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId, forceRegenerate: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tạo giọng thoại thất bại");
      }

      success(data.message || "Đã tạo giọng lồng tiếng AI thành công!", "Hoàn tất");
      await fetchEpisode();
    } catch (err: any) {
      error(err.message || "Lỗi khi sinh giọng thoại");
    } finally {
      setIsGeneratingVoices(false);
    }
  };

  const [isGeneratingKlingAudio, setIsGeneratingKlingAudio] = useState(false);

  const handleGenerateKlingAudio = async (sceneId?: string) => {
    try {
      setIsGeneratingKlingAudio(true);
      info(
        sceneId
          ? "Đang dùng Kling AI sinh âm thanh hoạt ảnh & tiếng động tự nhiên cho cảnh này..."
          : "Đang dùng Kling Video-to-Audio sinh âm thanh hoạt ảnh tự nhiên cho cả 4 cảnh...",
        "Đang xử lý Kling Audio"
      );

      const res = await fetch(`/api/animation/episodes/${id}/generate-kling-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tạo âm thanh hoạt ảnh thất bại");
      }

      success(data.message || "Đã sinh âm thanh Kling và xuất phim mới thành công!", "Hoàn tất");
      await fetchEpisode();
    } catch (err: any) {
      error(err.message || "Lỗi khi sinh âm thanh Kling");
    } finally {
      setIsGeneratingKlingAudio(false);
    }
  };

  const handleDeleteSceneAsset = async (assetId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tệp này khỏi cảnh?")) return;
    try {
      const res = await fetch(`/api/animation/scene-assets/${assetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xóa asset thất bại");
      success("Đã xóa tệp thành công");
      await fetchEpisode();
    } catch (err: any) {
      error(err.message || "Lỗi khi xóa tệp");
    }
  };

  const handleGenerateFullAIVideo = async (
    providerOverride?: "fal" | "google",
    modeOverride?: "all_scenes" | "single",
    durationOverride?: string,
    sceneId?: string
  ) => {
    const providerToUse = providerOverride || selectedProvider;
    const modeToUse = modeOverride || (sceneId ? "single" : "all_scenes");
    const durationToUse = durationOverride || "10";

    try {
      setIsGeneratingAI(true);
      setAiErrorDetails(null);
      setAiSuccessMessage(null);
      setFalBillingUrl(null);

      const modeText =
        modeToUse === "all_scenes"
          ? "trọn bộ 4 cảnh và tự động nối full tập"
          : sceneId
          ? "video 10s cho cảnh được chọn"
          : "1 cảnh mẫu 10s";
      const providerLabel = providerToUse === "fal" ? "Kling AI qua Fal.ai" : "Google Video AI";
      info(`Đang gọi ${providerLabel} để tạo ${modeText}...`, "Đang xử lý");

      const res = await fetch(`/api/animation/episodes/${id}/generate-ai-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerToUse,
          mode: modeToUse,
          duration: durationToUse,
          sceneId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || "Tạo video AI thất bại";
        setAiErrorDetails(errMsg);
        if (data.billingUrl) {
          setFalBillingUrl(data.billingUrl);
        }
        error(errMsg, providerToUse === "fal" ? "Fal.ai / Kling API" : "Google API");
        if (data.prompt) {
          setFullPrompt(data.prompt);
        }
        return;
      }

      setAiSuccessMessage(data.message || "Đã tạo video AI thành công!");
      success(data.message || "Đã tạo video AI thành công!", "Hoàn tất");
      await fetchEpisode();
    } catch (err: any) {
      const msg = err.message || "Lỗi khi gọi API tạo video";
      setAiErrorDetails(msg);
      error(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleUploadFullVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploadingFullVideo(true);
      info("Đang tải lên và lưu video hoàn chỉnh của tập phim...", "Đang lưu");

      const res = await fetch(`/api/animation/episodes/${id}/upload-render`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tải lên video thất bại");

      success("Đã lưu video hoàn chỉnh của tập phim thành công!", "Hoàn tất");
      setAiErrorDetails(null);
      await fetchEpisode();
    } catch (err: any) {
      error(err.message || "Tải lên video thất bại");
    } finally {
      setIsUploadingFullVideo(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleTriggerRender = async () => {
    try {
      setIsRendering(true);
      info("Đang render video dọc 1080x1920 qua FFmpeg...", "Đang xử lý");

      const res = await fetch(`/api/animation/episodes/${id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceNativeAudio: false, burnSubtitles: false }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render thất bại");

      success("Render tập phim thành công!", "Hoàn tất");
      setIsRenderModalOpen(false);
      fetchEpisode();
    } catch (err: any) {
      error(err.message || "Render thất bại");
    } finally {
      setIsRendering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm font-medium">Đang tải Storyboard tập phim...</p>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="p-16 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Chưa tải được tập phim</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tập phim chưa sẵn sàng hoặc kết nối đang chờ nạp. Bạn có thể bấm nút thử lại bên dưới.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchEpisode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <RotateCw className="w-4 h-4" />
            <span>Thử lại ngay</span>
          </button>
          <Link
            href="/animation"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-semibold hover:bg-secondary/80 text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về danh sách</span>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate approval progress
  const totalScenes = episode.scenes.length;
  const approvedScenesCount = episode.scenes.filter((s) =>
    s.assets.some((a) => a.assetType === AnimationAssetType.RAW_VIDEO && a.approved)
  ).length;
  const progressPercent = totalScenes > 0 ? Math.round((approvedScenesCount / totalScenes) * 100) : 0;

  const activeRender =
    (selectedRenderId ? episode.renders.find((r) => r.id === selectedRenderId) : null) ||
    episode.renders.find((r) => r.active) ||
    episode.renders[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/animation" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Film className="w-3.5 h-3.5" />
          <span>Animation Studio</span>
        </Link>
        <span>/</span>
        <Link href={`/animation/series/${episode.season.series.id}`} className="hover:text-foreground transition-colors">
          {episode.season.series.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Tập {String(episode.number).padStart(2, "0")}</span>
      </div>

      {/* Episode Header & Action Card */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                TẬP {String(episode.number).padStart(2, "0")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {episode.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                Mục tiêu: {episode.targetDurationSec}s
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {episode.title}
            </h1>

            {episode.logline && (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {episode.logline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Provider Selector */}
            <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setSelectedProvider("fal")}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  selectedProvider === "fal"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Sử dụng Kling AI qua Fal.ai - Chuyên phim hoạt hình 3D giữ nguyên tạo hình"
              >
                <span>🎬 Kling AI (Fal.ai)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("google")}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  selectedProvider === "google"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Sử dụng Google Video AI (Yêu cầu tài khoản Vertex AI)"
              >
                <span>Google Veo</span>
              </button>
            </div>

            {/* Full 4-scenes Concatenated Episode Button */}
            <button
              onClick={() => handleGenerateFullAIVideo(selectedProvider, "all_scenes", "10")}
              disabled={isGeneratingAI}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              title="Tạo cả 4 cảnh bằng Kling AI và tự động dùng FFmpeg ghép thành video full tập 40 giây"
            >
              {isGeneratingAI ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý tạo video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>⭐ Tạo Full 4 Cảnh & Nối Tập (40s)</span>
                </>
              )}
            </button>

            {/* Auto Generate 4 Keyframes Button */}
            <button
              onClick={() => handleGenerateKeyframes()}
              disabled={isGeneratingKeyframes || isGeneratingAI}
              className="px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-xs border border-purple-500/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Tự động sinh 4 ảnh Keyframe 3D Pixar bằng Google Gemini theo đúng nhân vật khóa"
            >
              {isGeneratingKeyframes ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Đang sinh Keyframe Gemini...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>🎨 Tự Động Sinh 4 Keyframe (Gemini)</span>
                </>
              )}
            </button>

            {/* Auto Generate Kling Audio (Video-to-Audio) */}
            <button
              onClick={() => handleGenerateKlingAudio()}
              disabled={isGeneratingKlingAudio || isGeneratingAI}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Dùng Kling Video-to-Audio tự động sinh tiếng động hoạt ảnh, bước chân, hiệu ứng môi trường tự nhiên cho cả 4 cảnh"
            >
              {isGeneratingKlingAudio ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Đang sinh Kling Audio...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎵 Sinh Âm Thanh Kling (Foley/SFX)</span>
                </>
              )}
            </button>

            {/* Quick 1-Scene 10s Test Button */}
            <button
              onClick={() => handleGenerateFullAIVideo(selectedProvider, "single", "10")}
              disabled={isGeneratingAI}
              className="px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Tạo thử 1 cảnh 10s bằng Kling AI"
            >
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tạo Thử 1 Cảnh (10s)</span>
            </button>

            <button
              onClick={() => fullVideoFileInputRef.current?.click()}
              disabled={isUploadingFullVideo}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm disabled:opacity-50"
              title="Chọn file video MP4 của cả tập từ máy tính để lưu ngay"
            >
              {isUploadingFullVideo ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>📤 Tải Lên Video Cả Tập (.mp4)</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyFullPrompt}
              className="px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5 transition-all"
              title="Sao chép Master Prompt toàn tập để dán vào Sora / Veo / Kling / Luma / ChatGPT"
            >
              {copiedFullPrompt ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedFullPrompt ? "Đã chép prompt!" : "Chép Prompt Cả Tập"}</span>
            </button>

            {/* Hidden file input for 1-click native upload without any modal popup */}
            <input
              ref={fullVideoFileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleUploadFullVideoFile}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Inline AI Progress Banner (Directly on page, no modal) */}
      {isGeneratingAI && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-indigo-400">
            <RotateCw className="w-5 h-5 animate-spin" />
            <span className="font-bold text-sm">
              Đang kết nối Gemini API từ .env.local để khởi tạo video toàn tập...
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hệ thống đang gửi kịch bản toàn tập (chuẩn 3D CGI 9:16) tới Google Video AI và xử lý trực tiếp trên trang. Vui lòng chờ trong giây lát.
          </p>
        </div>
      )}

      {/* Inline AI Success Banner */}
      {aiSuccessMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
          <button
            onClick={() => setAiSuccessMessage(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Inline AI Notification / Error Banner (Directly on page, no modal) */}
      {aiErrorDetails && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Thông Báo Trạng Thái Video AI (Fal.ai / Kling / Google)</span>
            </div>
            <button
              onClick={() => setAiErrorDetails(null)}
              className="text-xs text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-amber-200/90 leading-relaxed font-mono bg-black/40 p-3.5 rounded-xl border border-amber-500/20">
            {aiErrorDetails}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {falBillingUrl && (
              <a
                href={falBillingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-md transition-all"
              >
                <span>👉 Nạp tiền tài khoản Fal.ai tại đây (fal.ai/dashboard/billing)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => fullVideoFileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Chọn video MP4 từ máy tính tải lên ngay</span>
            </button>

            <button
              onClick={handleCopyFullPrompt}
              className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              <span>Sao chép Master Prompt để tạo ngoài</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Grid: Video Player (Left) + Master Prompt (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Full Episode Video Player (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileVideo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Video Tập Phim (9:16 Dọc)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {activeRender
                    ? `Bản hoàn thiện v${activeRender.version} • ${
                        (activeRender.metadata as any)?.originalFileName?.includes("kling") ||
                        (activeRender.metadata as any)?.notes?.includes("Kling") ||
                        activeRender.localPath?.includes("kling")
                          ? "Tạo bởi Kling AI Video"
                          : "1080x1920"
                      }`
                    : "Chưa có file video hoàn chỉnh"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Version Selector Tabs */}
              {episode.renders.length > 1 && (
                <div className="flex items-center gap-1 p-1 bg-secondary/80 rounded-xl border border-border text-xs">
                  {episode.renders.map((r) => {
                    const isKling =
                      (r.metadata as any)?.originalFileName?.includes("kling") ||
                      (r.metadata as any)?.notes?.includes("Kling") ||
                      r.localPath?.includes("kling");
                    const isSelected = activeRender?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRenderId(r.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-500 text-black font-bold shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>v{r.version}</span>
                        {isKling && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-black/20">
                            Kling AI
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeRender && (
                <a
                  href={`/api/media/file/${activeRender.localPath}?v=${activeRender.id}`}
                  download={`xom-mit-na-tap-${episode.number}-v${activeRender.version}.mp4`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  title="Tải video về máy tính"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải về</span>
                </a>
              )}
            </div>
          </div>

          {activeRender ? (
            <div className="space-y-4">
              <div className="relative mx-auto w-full max-w-[280px] rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl bg-black aspect-[9/16]">
                <video
                  key={activeRender.id}
                  src={`/api/media/file/${activeRender.localPath}?v=${activeRender.id}`}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span>Phiên bản v{activeRender.version}</span>
                    {((activeRender.metadata as any)?.originalFileName?.includes("kling") ||
                      (activeRender.metadata as any)?.notes?.includes("Kling") ||
                      activeRender.localPath?.includes("kling")) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
                        🎬 Kling AI Video
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground block pt-0.5">
                    Xuất lúc {new Date(activeRender.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <button
                  onClick={() => fullVideoFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium border border-border"
                >
                  Thay thế video
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 border-2 border-dashed border-border rounded-2xl text-center space-y-4 bg-secondary/20">
              <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
                <FileVideo className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Chưa có video cho tập này
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Bấm &quot;Tạo Video AI Toàn Tập&quot; để sinh tự động từ Gemini API, hoặc chọn file video MP4 của bạn để tải lên.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
                <button
                  onClick={handleGenerateFullAIVideo}
                  disabled={isGeneratingAI}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Tạo Video AI Toàn Tập (Gemini API)</span>
                </button>
                <button
                  onClick={() => fullVideoFileInputRef.current?.click()}
                  disabled={isUploadingFullVideo}
                  className="w-full py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Tải lên video MP4</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Full Episode Master Prompt (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Master Prompt Video Toàn Tập (Chuẩn 3D CGI 9:16)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Khóa tạo hình nhân vật Mít, Na, Bí Bo, Bà Sen xuyên suốt tập phim
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyFullPrompt}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20 self-start sm:self-auto"
            >
              {copiedFullPrompt ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedFullPrompt ? "Đã sao chép!" : "Sao chép Prompt"}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                Nội dung câu lệnh khóa tạo hình & diễn biến toàn tập:
              </span>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-border font-mono text-xs text-foreground/90 max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {fullPrompt || "Đang tải prompt toàn tập..."}
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200/90 space-y-1.5">
              <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>💡 Cách sử dụng Prompt:</span>
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Bạn có thể bấm <strong>&quot;⚡ Tạo Video Bằng Kling AI&quot;</strong> ở góc trên để hệ thống tự động sinh video, hoặc sao chép prompt này dán vào Kling AI / Google Flow / Sora kèm ảnh mẫu của Bé Mít để tạo video.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Storyboard Scenes List (Collapsible) */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowStoryboard(!showStoryboard)}
            className="flex items-center gap-3 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary/20 transition-colors">
              <Clapperboard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Chi Tiết Kịch Bản Phân Cảnh ({episode.scenes.length} cảnh)</span>
                {showStoryboard ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {showStoryboard
                  ? "Bấm để thu gọn bảng phân cảnh"
                  : "Bấm để mở rộng xem chi tiết lời thoại và hành động từng cảnh"}
              </p>
            </div>
          </button>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Tùy chọn tra cứu nội dung
          </span>
        </div>

        {showStoryboard && (
          <div className="space-y-5 pt-3 border-t border-border animate-in fade-in duration-200">
            {episode.scenes.map((scene) => {
            const isLongScene = scene.durationSec > 8;
            const approvedVideo = scene.assets.find(
              (a) => a.assetType === AnimationAssetType.RAW_VIDEO && a.approved
            );
            const isPromptExpanded = expandedPrompts[scene.id] || false;

            return (
              <div
                key={scene.id}
                className={`rounded-2xl border ${
                  approvedVideo
                    ? "border-emerald-500/30 bg-card/80"
                    : "border-border bg-card/50"
                } p-6 space-y-5 backdrop-blur-md transition-all`}
              >
                {/* Scene Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      #{scene.orderIndex}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        Cảnh {scene.orderIndex} ({scene.startSec}s – {scene.endSec}s)
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Bối cảnh: <strong className="text-foreground">{scene.setting}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-mono text-xs font-semibold">
                      {scene.durationSec}s
                    </span>

                    {isLongScene && (
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        &gt;8s (Lưu ý tách clip)
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        approvedVideo
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {approvedVideo ? "Video Approved" : "Chờ Video Raw"}
                    </span>
                  </div>
                </div>

                {/* Action & Dialogue Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-1.5">
                    <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">
                      Hành động &amp; Hình ảnh:
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {scene.action}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-1.5">
                    <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-indigo-400">
                      Lời thoại chính xác:
                    </span>
                    <p className="text-foreground font-medium italic leading-relaxed">
                      {scene.dialogue || "Không có thoại"}
                    </p>
                  </div>
                </div>

                {/* Directions (Emotion & SFX) */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-secondary/20 p-3 rounded-xl border border-border/40">
                  {scene.emotionDirection && (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <strong>Diễn xuất:</strong> {scene.emotionDirection}
                    </span>
                  )}
                  {scene.soundDirection && (
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <strong>Âm thanh:</strong> {scene.soundDirection}
                    </span>
                  )}
                </div>

                {/* Prompts Action Bar */}
                <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyPrompt(scene.id, "IMAGE")}
                        className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 border border-border transition-colors active:scale-95"
                      >
                        {copiedKey === `${scene.id}-IMAGE` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>Copy Prompt Ảnh Keyframe</span>
                      </button>

                      <button
                        onClick={() => handleCopyPrompt(scene.id, "VIDEO")}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 border border-primary/20 transition-colors active:scale-95"
                      >
                        {copiedKey === `${scene.id}-VIDEO` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copy Prompt Video (CGI 9:16)</span>
                      </button>

                      <button
                        onClick={() => handleGenerateFullAIVideo("fal", "single", "10", scene.id)}
                        disabled={isGeneratingAI}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center gap-1.5 border border-indigo-500/20 transition-colors active:scale-95 disabled:opacity-50"
                        title="Tạo video 10s cho cảnh này bằng Kling AI Image-to-Video dựa trên ảnh Keyframe đã có"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🎬 Tạo Video Cảnh Này (Kling AI)</span>
                      </button>
                    </div>

                    <button
                      onClick={() => togglePromptExpand(scene.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <span>{isPromptExpanded ? "Thu gọn prompt" : "Xem prompt gốc"}</span>
                      {isPromptExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isPromptExpanded && (
                    <div className="p-3.5 rounded-xl bg-card border border-border text-xs font-mono text-muted-foreground leading-relaxed select-all">
                      {scene.visualPrompt}
                    </div>
                  )}
                </div>

                {/* Scene Assets & Approval */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <FileVideo className="w-4 h-4 text-primary" />
                      Assets Cảnh #{scene.orderIndex} ({scene.assets.length} tệp)
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerateKeyframes(scene.id)}
                        disabled={isGeneratingKeyframes}
                        className="px-3 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-500/25 active:scale-95 disabled:opacity-50"
                        title="Tự động sinh ảnh Keyframe 3D Pixar bằng Google Gemini cho cảnh này"
                      >
                        {isGeneratingKeyframes ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="w-3.5 h-3.5" />
                        )}
                        <span>Sinh Keyframe (Gemini)</span>
                      </button>

                      <button
                        onClick={() => handleGenerateKlingAudio(scene.id)}
                        disabled={isGeneratingKlingAudio}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/25 active:scale-95 disabled:opacity-50"
                        title="Dùng Kling Video-to-Audio sinh tiếng động hoạt ảnh tự nhiên cho cảnh này"
                      >
                        {isGeneratingKlingAudio ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>🎵 Kling Audio</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveSceneForUpload(scene);
                          setUploadAssetType(AnimationAssetType.RAW_VIDEO);
                        }}
                        className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-primary" />
                        <span>Upload Clip Raw / Keyframe</span>
                      </button>
                    </div>
                  </div>

                  {scene.assets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Chưa có video raw nào cho cảnh này. Hãy copy prompt video, tạo clip 5-8s trên AI (Veo/Gemini/Luma) rồi upload vào đây.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {scene.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className={`p-3 rounded-xl border ${
                            asset.approved
                              ? "border-emerald-500/40 bg-emerald-950/10"
                              : "border-border bg-secondary/30"
                          } space-y-2.5`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">
                              {asset.assetType} v{asset.version}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {asset.metadata?.hasAudio && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                  🎵 Kling SFX
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  asset.approved
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {asset.approved ? "APPROVED" : "DRAFT"}
                              </span>
                            </div>
                          </div>

                          {/* Video player preview if video */}
                          {asset.assetType === AnimationAssetType.RAW_VIDEO && (
                            <div className="relative group w-full aspect-[9/16] max-h-56 bg-black rounded-lg overflow-hidden border border-border">
                              <video
                                src={`/api/media/file/${asset.localPath}`}
                                controls
                                playsInline
                                className="w-full h-full object-contain"
                              />
                              <button
                                onClick={() =>
                                  setMediaPreview({
                                    url: `/api/media/file/${asset.localPath}`,
                                    type: "VIDEO",
                                    title: `Cảnh #${scene.orderIndex} - Video Clip Raw v${asset.version}`,
                                  })
                                }
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-primary text-white text-xs flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-all shadow-md backdrop-blur-sm"
                                title="Xem phóng to 9:16"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Image preview if keyframe */}
                          {asset.assetType === AnimationAssetType.KEYFRAME && (
                            <div
                              onClick={() =>
                                setMediaPreview({
                                  url: `/api/media/file/${asset.localPath}`,
                                  type: "IMAGE",
                                  title: `Cảnh #${scene.orderIndex} - Keyframe Minh Họa v${asset.version}`,
                                })
                              }
                              className="relative group w-full aspect-[9/16] max-h-56 bg-black rounded-lg overflow-hidden border border-border cursor-pointer"
                            >
                              <img
                                src={`/api/media/file/${asset.localPath}`}
                                alt="Keyframe"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px]">
                                <Eye className="w-4 h-4" />
                                <span>Phóng to ảnh</span>
                              </div>
                            </div>
                          )}

                          {/* Audio player preview if voice */}
                          {asset.assetType === AnimationAssetType.VOICE && (
                            <div className="w-full p-2.5 rounded-lg bg-black/40 border border-blue-500/20 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-blue-300 font-semibold">
                                <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                                <span>Thoại Nhân Vật AI (Gemini Voice)</span>
                              </div>
                              <audio
                                src={`/api/media/file/${asset.localPath}`}
                                controls
                                className="w-full h-8"
                              />
                              {asset.metadata?.lines && asset.metadata.lines.length > 0 && (
                                <div className="space-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/50 max-h-24 overflow-y-auto">
                                  {asset.metadata.lines.map((line: any, idx: number) => (
                                    <p key={idx} className="leading-snug">
                                      <strong className="text-foreground">{line.speaker}:</strong> "{line.text}"
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {Math.round(asset.fileSize / 1024)} KB
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDeleteSceneAsset(asset.id)}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
                                title="Xóa tệp này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleSceneAssetApproval(asset.id, asset.approved)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  asset.approved
                                    ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                                    : "bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                                }`}
                              >
                                {asset.approved ? "Hủy duyệt" : "Duyệt (APPROVE)"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Upload Scene Asset Modal */}
      {activeSceneForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Upload Asset Cảnh #{activeSceneForUpload.orderIndex}
              </h3>
              <button
                onClick={() => setActiveSceneForUpload(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Loại asset:</label>
                <select
                  value={uploadAssetType}
                  onChange={(e) => setUploadAssetType(e.target.value as AnimationAssetType)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value={AnimationAssetType.RAW_VIDEO}>Video Clip Raw (.mp4, .webm)</option>
                  <option value={AnimationAssetType.KEYFRAME}>Ảnh Keyframe (.png, .jpg)</option>
                  <option value={AnimationAssetType.VOICE}>File Thoại Voice (.wav, .mp3)</option>
                  <option value={AnimationAssetType.SFX}>Hiệu ứng Sound SFX (.wav, .mp3)</option>
                </select>
              </div>

              <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer relative bg-secondary/30">
                <input
                  type="file"
                  accept="video/mp4,video/webm,image/png,image/jpeg,audio/wav,audio/mpeg"
                  onChange={handleUploadSceneAsset}
                  disabled={isUploadingAsset}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-xs font-semibold text-foreground">
                    {isUploadingAsset ? "Đang tải lên asset..." : "Kéo thả hoặc nhấp chọn tệp"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">MP4, PNG, JPG, WAV tối đa 150MB</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveSceneForUpload(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Preflight & Confirmation Modal */}
      {isRenderModalOpen && renderPreflight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Clapperboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Render Tập Phim 1080x1920 (FFmpeg)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ghép nối video dọc 9:16 theo đúng thứ tự storyboard
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRenderModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preflight Check Status */}
            {!renderPreflight.canRender ? (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Chưa đủ điều kiện render! Hệ thống đã chặn render.</span>
                </div>
                <ul className="text-xs text-destructive/90 space-y-1 list-disc list-inside">
                  {renderPreflight.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Mỗi cảnh bắt buộc phải có ít nhất một video raw đã được bấm nút <strong>Duyệt (APPROVE)</strong> trước khi ghép nối thành tập hoàn chỉnh.
                </p>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setIsRenderModalOpen(false);
                      setIsAIGenerateModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Tạo Video AI Toàn Tập (Không Cần Chia Cảnh)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsRenderModalOpen(false);
                      setIsUploadFullModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>📤 Tải Lên Trực Tiếp Video Cả Tập (.mp4)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Đủ điều kiện render 100%!</span>
                </div>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Tất cả {totalScenes} cảnh đều đã có video clip được duyệt (APPROVED). FFmpeg sẽ scale pad đồng nhất 1080x1920 30fps và xuất file MP4.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRenderModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Đóng
              </button>

              <button
                onClick={handleTriggerRender}
                disabled={!renderPreflight.canRender || isRendering}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRendering ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Đang render FFmpeg...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bắt đầu Render 1080x1920</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* High-Resolution Media Preview Modal (9:16 Video / Image) */}
      {mediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-secondary/30">
              <h3 className="font-bold text-sm text-foreground truncate">
                {mediaPreview.title}
              </h3>
              <button
                onClick={() => setMediaPreview(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 flex items-center justify-center bg-black/60 overflow-hidden">
              {mediaPreview.type === "VIDEO" ? (
                <div className="w-full aspect-[9/16] max-h-[72vh] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    src={mediaPreview.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[9/16] max-h-[72vh] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={mediaPreview.url}
                    alt={mediaPreview.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-secondary/20">
              <span className="font-mono">Tỷ lệ chuẩn 9:16 (Vertical)</span>
              <button
                onClick={() => setMediaPreview(null)}
                className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-colors"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
