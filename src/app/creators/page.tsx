"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  Users,
  Copy,
  Check,
  Upload,
  Sparkles,
  Volume2,
  ShieldAlert,
  Image as ImageIcon,
} from "lucide-react";

interface ReferenceImage {
  id: string;
  type: string;
  localPath: string;
  version: number;
}

interface VoiceProfile {
  id: string;
  provider: string;
  providerVoiceId: string;
  tone: string;
  speakingRate: number;
}

interface Creator {
  id: string;
  name: "LINH" | "NAM";
  gender: string;
  ageStyle: string;
  description: string;
  masterAppearancePrompt: string;
  negativePrompt: string;
  voiceProfiles: VoiceProfile[];
  referenceImages: ReferenceImage[];
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [activeTab, setActiveTab] = useState<"LINH" | "NAM">("LINH");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchCreators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCreators = async () => {
    try {
      const res = await fetch("/api/creators");
      const data = await res.json();
      if (data.creators) {
        setCreators(data.creators);
      }
    } catch (err) {
      console.error("Lỗi tải creators:", err);
    }
  };

  const currentCreator =
    creators.find((c) => c.name === activeTab) || creators[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(label);
    toast.success(`Đã copy ${label} vào clipboard!`);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCreator) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subFolder", `creators/${currentCreator.name.toLowerCase()}`);

      const uploadRes = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      // Save reference record
      await fetch(`/api/creators/${currentCreator.id}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FRONT",
          localPath: uploadData.localPath,
        }),
      });

      await fetchCreators();
      toast.success("Upload ảnh chân dung thành công!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  if (!currentCreator) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Đang tải dữ liệu 2 Virtual Creator cố định...
      </div>
    );
  }

  const voice = currentCreator.voiceProfiles[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Virtual Creators</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            2 Nhân vật ảo cố định của kênh. Định dạng diện mạo và giọng nói chuẩn để đảm bảo tính nhất quán trên TikTok.
          </p>
        </div>

        {/* Sub-tabs: LINH | NAM */}
        <div className="flex bg-secondary p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("LINH")}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "LINH"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            LINH (Nữ 23-26)
          </button>
          <button
            onClick={() => setActiveTab("NAM")}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "NAM"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            NAM (Nam 25-29)
          </button>
        </div>
      </div>

      {/* Creator Detail Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual & Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {currentCreator.name} &bull; Visual Age {currentCreator.ageStyle}
              </span>
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              {currentCreator.description}
            </p>

            {/* Voice Profile Card */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Volume2 className="w-4 h-4 text-primary" />
                <span>Voice Profile ({voice?.provider || "MACOS_SAY"})</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tone: <span className="text-foreground">{voice?.tone || "Friendly, natural"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Voice ID: <code className="text-primary font-mono">{voice?.providerVoiceId}</code>
              </p>
            </div>

            {/* Upload Reference Image Button */}
            <div>
              <label
                htmlFor="ref-upload"
                className={`w-full py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Upload className="w-4 h-4 text-primary" />
                <span>{uploading ? "Đang tải lên..." : "+ Upload Ảnh Reference Mới"}</span>
              </label>
              <input
                id="ref-upload"
                type="file"
                accept="image/*"
                onChange={handleUploadReference}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Right Columns: Master Prompts & Reference Gallery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompts Section */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Master Appearance Prompt (ChatGPT / Midjourney)</h3>
              </div>
              <button
                onClick={() => handleCopy(currentCreator.masterAppearancePrompt, "master")}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
              >
                {copiedPrompt === "master" ? (
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
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border font-mono text-xs text-foreground leading-relaxed break-words">
              {currentCreator.masterAppearancePrompt}
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Negative Prompt Bắt Buộc</span>
                </div>
                <button
                  onClick={() => handleCopy(currentCreator.negativePrompt, "negative")}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  {copiedPrompt === "negative" ? (
                    <span className="text-emerald-500">Đã copy!</span>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/15 font-mono text-[11px] text-destructive leading-relaxed">
                {currentCreator.negativePrompt}
              </div>
            </div>
          </div>

          {/* Reference Images Gallery */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Bộ ảnh tham chiếu (Reference Images)</h3>
                <p className="text-xs text-muted-foreground">
                  Dùng để đưa vào ChatGPT/Midjourney làm ảnh mẫu để giữ nguyên khuôn mặt
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {currentCreator.referenceImages.length} references
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentCreator.referenceImages.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-xl border border-border bg-secondary/40 overflow-hidden flex flex-col group"
                >
                  <div className="aspect-[9/16] bg-secondary flex items-center justify-center relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/file/${ref.localPath}`}
                      alt={ref.type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback icon if file is not on disk yet
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-muted-foreground bg-secondary/80 group-hover:opacity-0 transition-opacity">
                      <ImageIcon className="w-6 h-6 mb-1 text-primary/60" />
                      <span className="text-[10px] font-mono">{ref.type}</span>
                    </div>
                  </div>
                  <div className="p-2 border-t border-border bg-card text-[11px] flex items-center justify-between">
                    <span className="font-semibold truncate">{ref.type}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">v{ref.version}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
