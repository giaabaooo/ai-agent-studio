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
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  FileText,
  Volume2,
  Film,
  CheckCircle2,
} from "lucide-react";

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
  const [creative, setCreative] = useState<CreativeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCreative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        if (imgAsset) setUploadedImage(imgAsset.localPath);
        if (vidAsset) setUploadedVideo(vidAsset.localPath);
      }
    } catch (err) {
      console.error("Lỗi tải creative:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
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

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (type === "image") {
        setUploadedImage(data.localPath);
      } else {
        setUploadedVideo(data.localPath);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  if (loading || !creative) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        Đang tải Creative Studio...
      </div>
    );
  }

  const imagePrompt =
    creative.prompts.find((p) => p.type === "IMAGE_MODEL_PRODUCT")?.content ||
    "Prompt ảnh chưa được tạo";
  const videoPrompt =
    creative.prompts.find((p) => p.type === "VIDEO_VEO_GEMINI")?.content ||
    "Prompt video chưa được tạo";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/content"
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors"
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

      {/* Section 2: Production Pipeline Steps (Happy Path Bridge) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step A: ChatGPT Image Prompt */}
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Bước 1 &bull; Prompt Ảnh ChatGPT
              </span>
              <button
                onClick={() => handleCopy(imagePrompt, "image")}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
              >
                {copiedType === "image" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Dán prompt này vào ChatGPT kèm ảnh Creator &amp; ảnh Product để tạo ảnh mẫu 9:16.
            </p>

            <div className="p-3 rounded-xl bg-secondary/50 border border-border font-mono text-xs leading-relaxed max-h-40 overflow-y-auto">
              {imagePrompt}
            </div>
          </div>

          <div>
            {uploadedImage ? (
              <div className="p-3 rounded-xl bg-secondary/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Ảnh đã upload thành công
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {uploadedImage}
                </span>
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

        {/* Step B: Gemini/Veo Video Prompt */}
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Bước 2 &bull; Prompt Video Gemini/Veo
              </span>
              <button
                onClick={() => handleCopy(videoPrompt, "video")}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-semibold"
              >
                {copiedType === "video" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Dán prompt này vào Gemini/Veo cùng ảnh mẫu vừa tạo để sinh video 10-12s raw MP4.
            </p>

            <div className="p-3 rounded-xl bg-secondary/50 border border-border font-mono text-xs leading-relaxed max-h-40 overflow-y-auto">
              {videoPrompt}
            </div>
          </div>

          <div>
            {uploadedVideo ? (
              <div className="p-3 rounded-xl bg-secondary/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Video raw.mp4 đã upload
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {uploadedVideo}
                </span>
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

      {/* Step 3: Voice & FFmpeg Post-Processing Notice */}
      <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Hậu Kỳ &amp; Ghép Video (Local FFmpeg Pipeline)</h4>
            <p className="text-xs text-muted-foreground">
              Sinh giọng đọc theo timeline kịch bản, tự động tạo phụ đề timed, và ghép thành video hoàn chỉnh 1080x1920 sẵn sàng cho TikTok.
            </p>
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-mono px-3 py-1.5 rounded-lg bg-secondary border border-border">
          Phase 2 Media Ready
        </span>
      </div>
    </div>
  );
}
