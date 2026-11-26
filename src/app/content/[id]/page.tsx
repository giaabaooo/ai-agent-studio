"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Sparkles,
  Copy,
  Check,
  Upload,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Volume2,
  Film,
  CheckCircle2,
  Share2,
  Download,
  AlertCircle,
  ExternalLink,
  Send,
  ArrowRight,
  Video,
  CheckCheck,
  RotateCcw,
  Eye,
  Sliders,
  FileVideo,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface TimelineItem {
  id: string;
  startSec: number;
  endSec: number;
  visualDesc: string;
  voiceText: string;
  overlayText: string | null;
  orderIndex: number;
}

interface PromptItem {
  id: string;
  type: "IMAGE_MODEL_PRODUCT" | "IMAGE_THUMBNAIL" | "VIDEO_VEO_GEMINI";
  content: string;
  version: number;
}

interface Asset {
  id: string;
  type: string;
  localPath: string;
  version: number;
  metadata?: any;
  createdAt?: string;
}

interface CreativeDetail {
  id: string;
  hook: string;
  hookType: string;
  angle: string;
  durationSec: number;
  caption: string;
  hashtags: string[];
  cta: string;
  contentIntent: string;
  claimGuardStatus: "PASS" | "WARNING" | "BLOCK";
  claimGuardReport: any;
  status: string;
  creator: {
    name: string;
    description: string;
    masterAppearancePrompt: string;
    negativePrompt: string;
  };
  product: {
    name: string;
    category: string;
    description: string;
    images: { localPath: string }[];
  };
  timelines: TimelineItem[];
  prompts: PromptItem[];
  assets: Asset[];
}

export default function CreativeStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();

  const [creative, setCreative] = useState<CreativeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [selectedVideoChoice, setSelectedVideoChoice] = useState<"raw" | "edited">("edited");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<"voice" | "render" | "confirmRaw" | null>(null);
  const [replaceNativeAudio, setReplaceNativeAudio] = useState(false);
  const [burnSubtitles, setBurnSubtitles] = useState(false);
  const [showEditOptions, setShowEditOptions] = useState(false);
  const [tiktokStatus, setTiktokStatus] = useState<any>(null);
  const [draftUploading, setDraftUploading] = useState(false);
  const [draftResult, setDraftResult] = useState<{ publishId: string; message: string } | null>(null);
  const [checklist, setChecklist] = useState({
    captionCopied: false,
    productNoted: false,
    aigcEnabled: false,
  });

  useEffect(() => {
    fetchCreative();
    fetchTikTokStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    setActiveStep(step);
    setTimeout(() => {
      const el = document.getElementById(`step-${step}-card`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  const fetchTikTokStatus = async () => {
    try {
      const res = await fetch("/api/tiktok/status");
      if (res.ok) {
        const json = await res.json();
        setTiktokStatus(json);
      }
    } catch {}
  };

  const handleDraftUpload = async () => {
    if (!tiktokStatus?.configured || tiktokStatus?.status !== "CONNECTED") {
      toast.error("Vui lòng kết nối tài khoản TikTok trong trang Cài đặt trước khi tải nháp.", "Chưa kết nối");
      return;
    }
    setDraftUploading(true);
    try {
      const res = await fetch("/api/tiktok/draft/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Tải lên nháp TikTok thất bại");
      }
      setDraftResult({
        publishId: json.publishId,
        message: json.message || "Tải lên hộp thư nháp TikTok Inbox thành công!",
      });
      toast.success(json.message || "Đã gửi video nháp vào TikTok Inbox thành công!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải lên nháp TikTok thất bại");
    } finally {
      setDraftUploading(false);
    }
  };

  const fetchCreative = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creatives/${id}`);
      const data = await res.json();
      if (data.creative) {
        setCreative(data.creative);
        const imgAsset = data.creative.assets?.find(
          (a: Asset) => a.type === "GENERATED_IMAGE"
        );
        const vidAsset = data.creative.assets?.find(
          (a: Asset) => a.type === "RAW_VIDEO"
        );
        const finalAsset = data.creative.assets?.find(
          (a: Asset) => a.type === "FINAL_VIDEO"
        );

        if (imgAsset) setUploadedImage(imgAsset.localPath);
        if (vidAsset) setUploadedVideo(vidAsset.localPath);

        // Determine step on load
        if (finalAsset) {
          setActiveStep(4);
          if (finalAsset.metadata?.source === "RAW_CONFIRMED") {
            setSelectedVideoChoice("raw");
          } else {
            setSelectedVideoChoice("edited");
          }
        } else if (vidAsset) {
          setActiveStep(3);
          setSelectedVideoChoice("raw");
        } else if (imgAsset) {
          setActiveStep(2);
        } else {
          setActiveStep(1);
        }
      }
    } catch (err) {
      console.error("Lỗi tải creative:", err);
      toast.error("Không thể tải thông tin Creative Studio.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success(`Đã copy ${label} vào clipboard!`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subFolder", type === "image" ? "generated" : "raw");
      formData.append("creativeId", id);
      formData.append("assetType", type === "image" ? "GENERATED_IMAGE" : "RAW_VIDEO");

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (type === "image") {
        setUploadedImage(data.localPath);
        toast.success("Upload ảnh ChatGPT thành công! Tự động chuyển sang Bước 2.");
        await fetchCreative();
        goToStep(2);
      } else {
        setUploadedVideo(data.localPath);
        setSelectedVideoChoice("raw");
        toast.success("Upload video raw thành công! Sẵn sàng xem trước & hậu kỳ ở Bước 3.");
        await fetchCreative();
        goToStep(3);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmRawVideo = async () => {
    setProcessing("confirmRaw");
    try {
      const res = await fetch(`/api/creatives/${id}/confirm-raw`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedVideoChoice("raw");
      toast.success("Đã chọn và xác nhận Video Gốc! Chuyển sang Bước 4.");
      await fetchCreative();
      goToStep(4);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể xác nhận video gốc");
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmFinalVideo = () => {
    setSelectedVideoChoice("edited");
    toast.success("Đã chọn và xác nhận Video Đã Hậu Kỳ! Chuyển sang Bước 4 để xuất bản.");
    goToStep(4);
  };

  const runPipeline = async (action: "voice" | "render") => {
    setProcessing(action);
    try {
      const res = await fetch(`/api/creatives/${id}/${action}`, {
        method: "POST",
        ...(action === "render" && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replaceNativeAudio, burnSubtitles }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "voice") {
        toast.success("Đã tạo voice dự phòng thành công!");
      } else {
        setSelectedVideoChoice("edited");
        toast.success("Render video thành công! Bạn có thể chọn video gốc hoặc video đã sửa bên dưới.");
      }
      await fetchCreative();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Pipeline thất bại");
    } finally {
      setProcessing(null);
    }
  };

  if (loading || !creative) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Đang tải Creative Studio...</span>
      </div>
    );
  }

  const imagePrompt =
    creative.prompts.find((p) => p.type === "IMAGE_MODEL_PRODUCT")?.content ||
    "Prompt ảnh chưa được tạo";
  const videoPrompt =
    creative.prompts.find((p) => p.type === "VIDEO_VEO_GEMINI")?.content ||
    "Prompt video chưa được tạo";

  // Pick the newest assets
  const finalAsset = creative.assets?.find((a) => a.type === "FINAL_VIDEO");
  const rawAsset = creative.assets?.find((a) => a.type === "RAW_VIDEO");
  const isRawConfirmed = finalAsset?.metadata?.source === "RAW_CONFIRMED";
  const isRenderedFinal = Boolean(finalAsset && !isRawConfirmed);
  const currentVideoSrc = uploadedVideo || rawAsset?.localPath;

  const stepsMeta = [
    {
      num: 1 as const,
      name: "Ảnh Mẫu",
      tool: "ChatGPT",
      completed: Boolean(uploadedImage),
      color: "from-blue-500 to-indigo-600",
    },
    {
      num: 2 as const,
      name: "Video Raw",
      tool: "Gemini / Veo",
      completed: Boolean(uploadedVideo || rawAsset),
      color: "from-indigo-600 to-violet-600",
    },
    {
      num: 3 as const,
      name: "Xem & Hậu Kỳ",
      tool: "Preview / Edit",
      completed: Boolean(finalAsset),
      color: "from-emerald-500 to-teal-600",
    },
    {
      num: 4 as const,
      name: "Đăng TikTok",
      tool: "Checklist & Post",
      completed: Boolean(draftResult || creative.status === "PUBLISHED"),
      color: "from-pink-500 to-rose-600",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/content"
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {creative.creator.name} &bull; {creative.hookType}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                creative.claimGuardStatus === "BLOCK"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : creative.claimGuardStatus === "WARNING"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }`}
            >
              Claim Guard: {creative.claimGuardStatus}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            &quot;{creative.hook}&quot;
          </h2>
          <p className="text-xs text-muted-foreground">
            Sản phẩm: <span className="text-foreground font-medium">{creative.product.name}</span>
          </p>
        </div>
      </div>

      {/* Claim Guard Notice */}
      {creative.claimGuardStatus !== "PASS" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-500">
            <ShieldAlert className="w-4 h-4" />
            <span>Cảnh báo Claim Guard</span>
          </div>
          <p className="text-foreground">
            {creative.claimGuardReport?.reasons?.[0] || "Cần điều chỉnh từ ngữ tuyên bố sản phẩm."}
          </p>
        </div>
      )}

      {/* Section 1: Shot-by-Shot Timeline */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm">Kịch Bản Chi Tiết Từng Giây (Shot-by-Shot Timeline)</h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Thời lượng: {creative.durationSec} giây
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-border rounded-xl overflow-hidden">
            <thead className="bg-secondary/70 text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 w-20">Timeline</th>
                <th className="p-3 w-1/3">Visual Shot (Hình ảnh)</th>
                <th className="p-3">Voiceover (Lời thoại đọc)</th>
                <th className="p-3 w-40">Overlay Text (Chữ nổi)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {creative.timelines.map((shot) => (
                <tr key={shot.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-primary">
                    {shot.startSec}s - {shot.endSec}s
                  </td>
                  <td className="p-3 text-foreground leading-relaxed">
                    {shot.visualDesc}
                  </td>
                  <td className="p-3 text-foreground font-medium leading-relaxed">
                    &quot;{shot.voiceText}&quot;
                  </td>
                  <td className="p-3">
                    {shot.overlayText ? (
                      <span className="bg-secondary px-2 py-1 rounded text-[11px] font-bold text-foreground">
                        {shot.overlayText}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <div>
            <strong>Caption đề xuất:</strong> {creative.caption}{" "}
            <span className="text-primary font-mono">{creative.hashtags.join(" ")}</span>
          </div>
          <div>
            <strong>CTA:</strong> {creative.cta}
          </div>
        </div>
      </div>

      {/* STEPPER PROGRESS BAR WITH DYNAMIC ANIMATION */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Tiến trình sản xuất video (4 bước)</span>
          </h4>
          <span className="text-xs font-semibold text-primary">
            Bước {activeStep} / 4 &bull; {stepsMeta[activeStep - 1].name}
          </span>
        </div>

        {/* Relative Stepper Container */}
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-secondary rounded-full -z-0" />
          {/* Animated Active Line */}
          <div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-primary via-indigo-500 to-pink-500 rounded-full transition-all duration-700 ease-out -z-0"
            style={{
              width: `${((activeStep - 1) / 3) * 100}%`,
              maxWidth: "calc(100% - 3rem)",
            }}
          />

          {/* Stepper Buttons Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-2">
            {stepsMeta.map((s) => {
              const isActive = activeStep === s.num;
              const isCompleted = s.completed;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => goToStep(s.num)}
                  className="flex flex-col items-center text-center group cursor-pointer focus:outline-none transition-transform duration-300"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-md ${
                      isActive
                        ? "ring-4 ring-primary/30 bg-primary text-primary-foreground scale-110 shadow-primary/25 font-extrabold"
                        : isCompleted
                        ? "bg-emerald-600 text-white hover:scale-105"
                        : "bg-secondary text-muted-foreground border border-border group-hover:bg-secondary/80"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{s.num}</span>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <div
                      className={`text-xs font-bold transition-colors ${
                        isActive
                          ? "text-primary"
                          : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground hidden sm:block">
                      {s.tool}
                    </div>
                  </div>

                  {isActive && (
                    <span className="mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                      Đang ở bước này
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Production Pipeline Steps (Happy Path Bridge) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: ChatGPT Image Prompt */}
        <div
          id="step-1-card"
          className={`p-6 rounded-2xl bg-card border flex flex-col justify-between space-y-4 transition-all duration-500 ${
            activeStep === 1
              ? "border-primary/80 ring-2 ring-primary/40 shadow-xl shadow-primary/10 scale-[1.01]"
              : "border-border/60 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span>Bước 1</span> &bull; <span>Prompt Ảnh ChatGPT</span>
                </span>
                {activeStep === 1 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground animate-pulse">
                    ★ Đang thực hiện
                  </span>
                )}
              </div>
              <button
                onClick={() => handleCopy(imagePrompt, "image", "Prompt ảnh")}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
              >
                {copiedType === "image" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Dán prompt này vào ChatGPT kèm ảnh Creator &amp; ảnh Product để tạo ảnh mẫu 9:16.
            </p>

            <div className="p-3 rounded-xl bg-secondary/50 border border-border font-mono text-xs leading-relaxed max-h-40 overflow-y-auto">
              {imagePrompt}
            </div>
          </div>

          <div>
            {uploadedImage ? (
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Ảnh mẫu đã upload
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span>Chuyển sang Bước 2</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="chatgpt-img"
                className={`w-full py-3 px-4 rounded-xl border border-dashed border-primary/50 hover:bg-primary/5 text-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  uploading ? "opacity-50" : ""
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Ảnh Kết Quả từ ChatGPT</span>
                <input
                  id="chatgpt-img"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "image")}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Step 2: Gemini/Veo Video Prompt */}
        <div
          id="step-2-card"
          className={`p-6 rounded-2xl bg-card border flex flex-col justify-between space-y-4 transition-all duration-500 ${
            activeStep === 2
              ? "border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10 scale-[1.01]"
              : "border-border/60 opacity-80 hover:opacity-100"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span>Bước 2</span> &bull; <span>Prompt Video Gemini/Veo</span>
                </span>
                {activeStep === 2 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500 text-white animate-pulse">
                    ★ Đang thực hiện
                  </span>
                )}
              </div>
              <button
                onClick={() => handleCopy(videoPrompt, "video", "Prompt video")}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-semibold"
              >
                {copiedType === "video" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Dán prompt này vào Gemini/Veo cùng ảnh mẫu vừa tạo để sinh video 10-12s raw MP4.
            </p>

            <div className="p-3 rounded-xl bg-secondary/50 border border-border font-mono text-xs leading-relaxed max-h-40 overflow-y-auto">
              {videoPrompt}
            </div>
          </div>

          <div>
            {uploadedVideo ? (
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Video raw.mp4 đã upload
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Xem &amp; Hậu kỳ ở Bước 3</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="veo-vid"
                className={`w-full py-3 px-4 rounded-xl border border-dashed border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  uploading ? "opacity-50" : ""
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video raw.mp4 từ Veo</span>
                <input
                  id="veo-vid"
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => handleFileUpload(e, "video")}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: PREVIEW & POST-PROCESSING / SIDE-BY-SIDE SELECTION */}
      <div
        id="step-3-card"
        className={`p-6 rounded-2xl bg-card border space-y-6 transition-all duration-500 ${
          activeStep === 3
            ? "border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10 scale-[1.005]"
            : "border-border/60 opacity-80 hover:opacity-100"
        }`}
      >
        {/* Step 3 Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">
                  Bước 3 &bull; Xem Trước, So Sánh &amp; Chọn Video Xuất Bản
                </h4>
                {activeStep === 3 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white animate-pulse">
                    ★ Đang thực hiện
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bạn có thể bấm trực tiếp vào Video Gốc hoặc Video Đã Sửa để chọn video yêu thích trước khi sang Bước 4.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Upload Another Video Button */}
            <label className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm">
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>{uploading ? "Đang upload..." : "Đổi / Tải Video Raw Khác"}</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                disabled={uploading || processing !== null}
                onChange={(e) => handleFileUpload(e, "video")}
              />
            </label>
          </div>
        </div>

        {/* Video Area */}
        {!currentVideoSrc ? (
          <div className="p-8 rounded-xl bg-secondary/20 border border-dashed border-border text-center space-y-3">
            <Film className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-foreground">Chưa có video raw tải lên</h5>
              <p className="text-xs text-muted-foreground">
                Vui lòng upload video raw.mp4 từ Veo ở Bước 2 để xem trước và thực hiện hậu kỳ tại đây.
              </p>
            </div>
            <button
              onClick={() => goToStep(2)}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold border border-border transition-colors inline-flex items-center gap-1.5"
            >
              <span>Đi đến Bước 2 để Upload</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isRenderedFinal ? (
          /* CASE 1: SIDE-BY-SIDE VIDEO COMPARISON & INTERACTIVE SELECTION */
          <div className="space-y-5 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  Mời bạn bấm chọn 1 trong 2 video để làm video chính thức:
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setShowEditOptions(!showEditOptions)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{showEditOptions ? "Ẩn tùy chọn render lại" : "Tùy chọn render lại video?"}</span>
              </button>
            </div>

            {/* Dual Video Grid with Click-to-Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Raw Video Card */}
              <div
                onClick={() => setSelectedVideoChoice("raw")}
                className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-300 relative group ${
                  selectedVideoChoice === "raw"
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-500/25 bg-emerald-500/5 shadow-xl shadow-emerald-500/10"
                    : "border-border/80 bg-secondary/20 hover:border-emerald-500/40 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Selection Badge Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-muted-foreground" />
                      <span>1. Video Gốc (Raw Veo)</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      Audio Native Gốc
                    </span>
                  </div>

                  {/* Active Selection Banner */}
                  <div
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      selectedVideoChoice === "raw"
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary/70 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedVideoChoice === "raw"
                        ? "✓ ĐANG CHỌN VIDEO GỐC NÀY ĐỂ XUẤT BẢN"
                        : "Bấm vào khung này để chọn Video Gốc"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Giữ nguyên giọng thoại native tiếng Việt và âm thanh tự nhiên từ Veo, không chèn sub/voice mới.
                  </p>
                </div>

                {/* Video Player */}
                <div className="my-3 rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] flex items-center justify-center border border-border/50">
                  <video
                    src={`/api/media/file/${uploadedVideo || rawAsset?.localPath}`}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="text-[11px] text-muted-foreground text-center font-mono truncate">
                    {uploadedVideo || rawAsset?.localPath}
                  </div>

                  {/* Direct confirmation button for Raw Video */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmRawVideo();
                    }}
                    disabled={processing !== null}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                      selectedVideoChoice === "raw"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Dùng Video Gốc Này &amp; Sang Bước 4 ➔</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Edited Video Card */}
              <div
                onClick={() => setSelectedVideoChoice("edited")}
                className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-300 relative group ${
                  selectedVideoChoice === "edited"
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-500/25 bg-emerald-500/5 shadow-xl shadow-emerald-500/10"
                    : "border-border/80 bg-secondary/20 hover:border-emerald-500/40 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Selection Badge Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>2. Video Đã Sửa (1080×1920)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Đã Hậu Kỳ Voice &amp; Sub
                    </span>
                  </div>

                  {/* Active Selection Banner */}
                  <div
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      selectedVideoChoice === "edited"
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary/70 text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedVideoChoice === "edited"
                        ? "✓ ĐANG CHỌN VIDEO ĐÃ SỬA NÀY ĐỂ XUẤT BẢN"
                        : "Bấm vào khung này để chọn Video Đã Sửa"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Đã chuẩn hóa tỷ lệ 9:16 (1080×1920) kèm phụ đề và giọng đọc bạn đã chọn.
                  </p>
                </div>

                {/* Video Player */}
                <div className="my-3 rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] flex items-center justify-center border border-border/50">
                  <video
                    src={`/api/media/file/${finalAsset?.localPath}`}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="text-[11px] text-emerald-500 text-center font-mono font-medium truncate">
                    {finalAsset?.localPath}
                  </div>

                  {/* Direct confirmation button for Edited Video */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmFinalVideo();
                    }}
                    disabled={processing !== null}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                      selectedVideoChoice === "edited"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Dùng Video Đã Sửa Này &amp; Sang Bước 4 ➔</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Consolidated Confirm Action Box */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-xs text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    Bạn đang chọn:{" "}
                    <strong className="text-emerald-500">
                      {selectedVideoChoice === "raw"
                        ? "Video Gốc (Raw Veo - Audio Native)"
                        : "Video Đã Hậu Kỳ (1080×1920 có Voice/Sub)"}
                    </strong>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedVideoChoice === "raw"
                    ? "Hệ thống sẽ chuyển trực tiếp video gốc sang Bước 4 để đăng tải."
                    : "Hệ thống sẽ đưa video 1080×1920 đã hoàn chỉnh sang Bước 4 để đăng tải."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  selectedVideoChoice === "raw"
                    ? handleConfirmRawVideo
                    : handleConfirmFinalVideo
                }
                disabled={processing !== null}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
              >
                <span>
                  {processing === "confirmRaw"
                    ? "Đang xác nhận..."
                    : selectedVideoChoice === "raw"
                    ? "Xác nhận Video Gốc • Sang Bước 4"
                    : "Xác nhận Video Đã Sửa • Sang Bước 4"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: RAW VIDEO PREVIEW + 2 CHOICES (Dùng Gốc hoặc Hậu Kỳ) */
          <div className="space-y-6">
            {/* Single Raw Video Preview Player */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    Video Raw Tải Lên (Gemini / Veo)
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Audio Gốc Native
                </span>
              </div>

              <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] mx-auto flex items-center justify-center border border-border/50">
                <video
                  src={`/api/media/file/${currentVideoSrc}`}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[11px] text-muted-foreground text-center font-mono">
                {currentVideoSrc}
              </div>
            </div>

            {/* TWO ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Choice A: Skip Sub & Voice, use raw video */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/40 space-y-3 flex flex-col justify-between shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-500" />
                    <h5 className="font-bold text-xs text-foreground">
                      Lựa chọn 1: Dùng Video Gốc (Bỏ qua Sub &amp; Voice)
                    </h5>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Khuyên dùng nếu video Veo đã có giọng thoại tiếng Việt rõ ràng và âm thanh tự nhiên. Bấm xác nhận để sang thẳng Bước 4.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmRawVideo}
                  disabled={processing !== null}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {processing === "confirmRaw"
                      ? "Đang xác nhận..."
                      : "Xác nhận dùng video gốc & Sang Bước 4"}
                  </span>
                </button>
              </div>

              {/* Choice B: Voice & Subtitles post-processing */}
              <div className="p-5 rounded-xl bg-card border border-border space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <h5 className="font-bold text-xs text-foreground">
                      Lựa chọn 2: Chỉnh Sửa Thêm (Voice &amp; Subtitle)
                    </h5>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tùy chọn thay thế giọng đọc hoặc ép phụ đề chạy theo kịch bản. Sau khi render sẽ hiển thị 2 video để bạn so sánh trước khi xác nhận.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditOptions(!showEditOptions)}
                  className="w-full py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border flex items-center justify-center gap-2 transition-colors"
                >
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>{showEditOptions ? "Đóng cài đặt Voice & Sub" : "Mở cài đặt Voice & Sub"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Edit / Re-render Settings */}
        {(showEditOptions || (!isRenderedFinal && !isRawConfirmed)) && (
          <div className="p-5 rounded-xl bg-secondary/30 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Tùy Chọn Hậu Kỳ Nâng Cao (Voice &amp; Subtitle)</span>
              </h5>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span>Nguồn video đầu vào:</span>
                <span className="font-mono text-foreground font-semibold bg-background px-2 py-0.5 rounded border border-border">
                  {currentVideoSrc || "Chưa có video"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => runPipeline("voice")}
                disabled={processing !== null}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{processing === "voice" ? "Đang tạo voice..." : "Tạo voice dự phòng"}</span>
              </button>

              <label className="text-xs font-bold px-3.5 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Import voice thay thế</span>
                <input
                  type="file"
                  accept="audio/wav,audio/mpeg,audio/mp3,audio/aiff"
                  className="hidden"
                  disabled={processing !== null || uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const body = new FormData();
                      body.append("file", file);
                      body.append("subFolder", "voices");
                      body.append("creativeId", id);
                      body.append("assetType", "VOICE_AUDIO");
                      const res = await fetch("/api/media/upload", { method: "POST", body });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      toast.success("Import voice thành công!");
                      await fetchCreative();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Import voice thất bại");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => runPipeline("render")}
                disabled={processing !== null || !currentVideoSrc}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm ml-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {processing === "render"
                    ? "Đang render video..."
                    : "Render lại video hoàn chỉnh (1080×1920)"}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceNativeAudio}
                  onChange={(e) => setReplaceNativeAudio(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span>Thay audio Gemini/Veo bằng voice riêng đã tạo hoặc import</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span>Burn subtitle theo timeline vào video final</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* STEP 4: TIKTOK PUBLISHING PREP & CHECKLIST */}
      {(() => {
        const hasFinalVideo = Boolean(finalAsset);
        const fullCaption = `${creative.caption}\n\n${(creative.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;

        return (
          <div
            id="step-4-card"
            className={`p-6 rounded-2xl bg-card border space-y-6 transition-all duration-500 ${
              activeStep === 4
                ? "border-pink-500/80 ring-2 ring-pink-500/40 shadow-xl shadow-pink-500/10 scale-[1.005]"
                : "border-border/60 opacity-80 hover:opacity-100"
            }`}
          >
            {/* Step 4 Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      Bước 4 &bull; Xuất Bản TikTok &amp; Gắn Giỏ Hàng Affiliate
                    </h4>
                    {activeStep === 4 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-pink-500 text-white animate-pulse">
                        ★ Đang thực hiện
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                      Human-in-the-Loop
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kiểm duyệt nội dung thủ công, bật nhãn AIGC và tự gắn giỏ hàng affiliate trên TikTok App
                  </p>
                </div>
              </div>

              {hasFinalVideo && (
                <a
                  href={`/api/media/file/${finalAsset?.localPath}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 border border-border transition-colors shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Video Xuất Bản ({isRawConfirmed ? "Video Gốc" : "1080×1920"})</span>
                </a>
              )}
            </div>

            {/* Selected Video Status Banner in Step 4 */}
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-emerald-500" />
                <span>
                  Video đã duyệt xuất bản:{" "}
                  <strong className="text-foreground">
                    {isRawConfirmed
                      ? "Video Gốc (Raw Veo - Audio Native)"
                      : "Video Đã Hậu Kỳ (1080×1920 Full HD)"}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span>Đổi lựa chọn video ở Bước 3</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* TikTok Connection Info Banner */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-foreground">Tài khoản TikTok liên kết:</span>
                {tiktokStatus?.status === "CONNECTED" && tiktokStatus.account ? (
                  <span className="font-mono text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>@{tiktokStatus.account.username}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chưa kết nối tài khoản</span>
                  </span>
                )}
              </div>
              <Link
                href="/settings"
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>Cài đặt kết nối</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Manual Affiliate Checklist Grid */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Checklist kiểm duyệt trước khi đăng (Bắt buộc V1):
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Item 1 */}
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-1"
                    checked={hasFinalVideo}
                    readOnly
                    className="mt-0.5 rounded accent-primary"
                  />
                  <label htmlFor="chk-1" className="cursor-pointer space-y-0.5">
                    <div className="font-semibold text-foreground">
                      1. Video hoàn chỉnh ({isRawConfirmed ? "Video Gốc Đã Duyệt" : "1080×1920"})
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {hasFinalVideo
                        ? `Đã sẵn sàng tại: ${finalAsset?.localPath}`
                        : "Chưa xác nhận video. Vui lòng xác nhận video ở Bước 3."}
                    </div>
                  </label>
                </div>

                {/* Item 2 */}
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-2"
                    checked={creative.claimGuardStatus === "PASS"}
                    readOnly
                    className="mt-0.5 rounded accent-primary"
                  />
                  <label htmlFor="chk-2" className="cursor-pointer space-y-0.5">
                    <div className="font-semibold text-foreground">
                      2. Claim Guard: {creative.claimGuardStatus}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Không cam kết trị dứt điểm, không thổi phồng công dụng vượt quá sự thật.
                    </div>
                  </label>
                </div>

                {/* Item 3 */}
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-3"
                    checked={checklist.captionCopied}
                    onChange={(e) =>
                      setChecklist({ ...checklist, captionCopied: e.target.checked })
                    }
                    className="mt-0.5 rounded accent-primary"
                  />
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        3. Caption &amp; Hashtags
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fullCaption);
                          setChecklist({ ...checklist, captionCopied: true });
                          toast.success("Đã copy Caption & Hashtags vào clipboard!");
                        }}
                        className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Caption</span>
                      </button>
                    </div>
                    <div className="p-2 rounded bg-background border border-border text-[11px] text-muted-foreground line-clamp-2">
                      {fullCaption}
                    </div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-4"
                    checked={checklist.productNoted}
                    onChange={(e) =>
                      setChecklist({ ...checklist, productNoted: e.target.checked })
                    }
                    className="mt-0.5 rounded accent-primary"
                  />
                  <div className="space-y-1 w-full">
                    <div className="font-semibold text-foreground">
                      4. Gắn giỏ hàng thủ công trên app TikTok
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Sản phẩm: <strong className="text-foreground">{creative.product.name}</strong> &bull; Danh mục: {creative.product.category}.
                      TikTok không hỗ trợ API tự động gắn giỏ hàng cá nhân; bạn tự chọn sản phẩm trong Showcase khi đăng bài.
                    </div>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border flex items-start gap-2.5 md:col-span-2">
                  <input
                    type="checkbox"
                    id="chk-5"
                    checked={checklist.aigcEnabled}
                    onChange={(e) =>
                      setChecklist({ ...checklist, aigcEnabled: e.target.checked })
                    }
                    className="mt-0.5 rounded accent-primary"
                  />
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">
                      5. Bật nhãn &quot;Nội dung do AI tạo&quot; (AIGC Label: ON)
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Bắt buộc theo chính sách của TikTok đối với video có hình ảnh/giọng nói AI để tránh bị bóp tương tác hoặc cảnh cáo tài khoản.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inbox Draft Upload Section */}
            <div className="p-5 rounded-xl bg-secondary/30 border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload Thẳng vào TikTok Inbox (Inbox Draft)</span>
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Video được đẩy vào mục thông báo hệ thống của app TikTok dưới dạng nháp. Bạn mở app để duyệt và gắn sản phẩm.
                  </p>
                </div>

                <div>
                  {tiktokStatus?.draftUploadEnabled ? (
                    <button
                      onClick={handleDraftUpload}
                      disabled={draftUploading || !hasFinalVideo}
                      className="px-4 py-2 rounded-xl bg-pink-600 text-white font-bold text-xs hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{draftUploading ? "Đang upload nháp..." : "Gửi vào TikTok Inbox"}</span>
                    </button>
                  ) : (
                    <div className="text-right">
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground font-semibold text-xs border border-border cursor-not-allowed opacity-60"
                      >
                        Upload Draft (Tắt theo Feature Flag)
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        TIKTOK_DRAFT_UPLOAD_ENABLED=&quot;false&quot; (Mặc định an toàn)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {draftResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 font-medium">
                  {draftResult.message} &bull; Publish ID: <code className="font-mono">{draftResult.publishId}</code>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
