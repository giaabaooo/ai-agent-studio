"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  UploadCloud,
  ArrowRight,
  Flame,
  Cloud,
  Trash2,
  Download,
  Eye,
  Layers,
  ExternalLink,
  Shirt,
  HandMetal,
  Gem,
  RefreshCw,
  FolderHeart,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StylePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "streetwear_y2k",
    name: "Streetwear & Y2K Bắt Trend",
    icon: "🔥",
    description: "Cá tính đường phố, áo croptop / jacket cool ngầu, vibe TikToker hiện đại.",
  },
  {
    id: "luxury_glam",
    name: "Sang Trọng & Quý Phái (Luxury)",
    icon: "✨",
    description: "Đầm dạ hội cao cấp, penthouse sang trọng, ánh sáng ấm áp lung linh.",
  },
  {
    id: "kpop_idol",
    name: "K-Pop Idol / Ulzzang Hàn Quốc",
    icon: "🌸",
    description: "Trang điểm trong veo Hàn Quốc, trang phục idol trẻ trung, tươi tắn hút view.",
  },
  {
    id: "chic_office",
    name: "Công Sở Sành Điệu (Chic Office)",
    icon: "💼",
    description: "Blazer hiện đại, thanh lịch tự tin, phong thái nữ doanh nhân trẻ.",
  },
  {
    id: "sporty_fitness",
    name: "Thể Thao Khỏe Khoắn (Athleisure)",
    icon: "⚡",
    description: "Đồ tập gym tôn dáng, năng lượng tích cực, ánh sáng tự nhiên rực rỡ.",
  },
  {
    id: "studio_commercial",
    name: "Lookbook Chụp Thương Mại",
    icon: "📸",
    description: "Lookbook chuẩn studio chuyên nghiệp, phông nền đơn sắc, tôn sản phẩm tối đa.",
  },
  {
    id: "cyberpunk_neon",
    name: "Cyberpunk & Neon Độc Lạ",
    icon: "🔮",
    description: "Ánh sáng neon xanh tím tương lai, cực kỳ nổi bật và cuốn hút trên feed.",
  },
  {
    id: "coquette_cute",
    name: "Nữ Tính Dễ Thương (Coquette)",
    icon: "🎀",
    description: "Phong cách nàng thơ nhẹ nhàng, ren nơ pastel mềm mại, ánh sáng mộng mơ.",
  },
];

interface MixedResult {
  imageUrl: string;
  relPath?: string;
  storageProvider: "CLOUDINARY" | "LOCAL";
  title: string;
  productName: string;
  styleName: string;
  createdAt: string;
}

export default function TikTokAffiliateStudioPage() {
  const { success, error, info } = useToast();
  const router = useRouter();

  // Upload States
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const charInputRef = useRef<HTMLInputElement>(null);
  const prodInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Thời trang Nữ");
  const [poseAction, setPoseAction] = useState<"WEARING" | "HOLDING" | "SHOWCASING">("WEARING");
  const [selectedStyle, setSelectedStyle] = useState("streetwear_y2k");
  const [customPrompt, setCustomPrompt] = useState("");

  // Cloudinary State (Pre-configured via .env)
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);
  const [cloudName, setCloudName] = useState<string>("dcadn2syh");

  // Execution States
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<MixedResult | null>(null);
  const [recentMixes, setRecentMixes] = useState<MixedResult[]>([]);

  // Check Cloudinary Status on Mount
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

  // Load Recent Gallery Mixes
  const fetchRecentMixes = async () => {
    try {
      const res = await fetch("/api/gallery?category=affiliate_mix");
      const data = await res.json();
      if (data.success && data.items && data.items.length > 0) {
        const mapped: MixedResult[] = data.items.slice(0, 6).map((item: any) => ({
          imageUrl: item.url,
          relPath: item.localPath,
          storageProvider: item.storageProvider,
          title: item.title,
          productName: item.metadata?.productName || "Sản phẩm",
          styleName: item.metadata?.styleName || "AI Style",
          createdAt: item.createdAt,
        }));
        setRecentMixes(mapped);
        if (!currentResult && mapped.length > 0) {
          setCurrentResult(mapped[0]);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchCloudinaryStatus();
    fetchRecentMixes();
  }, []);

  // Handle Character File Upload
  const handleCharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCharacterImage(reader.result as string);
      success("Đã tải ảnh Nhân vật thành công!");
    };
    reader.readAsDataURL(file);
  };

  // Handle Product File Upload
  const handleProdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProductImage(reader.result as string);
      if (!productName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setProductName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      success("Đã tải ảnh Sản phẩm thành công!");
    };
    reader.readAsDataURL(file);
  };

  // Preset Sample Character
  const useSampleCharacter = (type: "linh" | "nam") => {
    if (type === "linh") {
      setCharacterImage("/api/media/file/tiktok-dance/characters/default_model.png");
      info("Đã chọn nhân vật mẫu: Model Nữ Linh");
    } else {
      setCharacterImage("/api/media/file/tiktok-dance/characters/default_model.png");
      info("Đã chọn nhân vật mẫu: Model Nam");
    }
  };

  // Generate Mixed Image with Gemini
  const handleGenerateMix = async () => {
    if (!characterImage) {
      error("Vui lòng tải lên hoặc chọn Ảnh Nhân Vật trước.");
      return;
    }
    if (!productImage) {
      error("Vui lòng tải lên Ảnh Sản Phẩm.");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch("/api/affiliate/mix-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterImage,
          productImage,
          productName: productName.trim() || "Sản phẩm TikTok Affiliate",
          productCategory,
          stylePreset: selectedStyle,
          customPrompt: customPrompt.trim(),
          poseAction,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể kết hợp ảnh bằng Gemini");
      }

      const newResult: MixedResult = {
        imageUrl: data.imageUrl,
        relPath: data.relPath,
        storageProvider: data.storageProvider,
        title: data.galleryItem?.title || `${productName} - Model Mix`,
        productName: productName || "Sản phẩm",
        styleName: STYLE_PRESETS.find((s) => s.id === selectedStyle)?.name || "AI Style",
        createdAt: new Date().toISOString(),
      };

      setCurrentResult(newResult);
      setRecentMixes((prev) => [newResult, ...prev]);
      success(data.message || "Tạo ảnh kết hợp Model & Sản phẩm thành công!");
    } catch (err: any) {
      error(err.message || "Lỗi khi xử lý qua Gemini API");
    } finally {
      setIsGenerating(false);
    }
  };

  // Transfer to TikTok Dance Studio
  const handleTransferToDance = (resultToTransfer?: MixedResult) => {
    const target = resultToTransfer || currentResult;
    if (!target) {
      error("Chưa có ảnh người mẫu để mang sang TikTok Dance.");
      return;
    }

    // Save to sessionStorage for robust cross-page transfer
    sessionStorage.setItem(
      "dance_incoming_model",
      JSON.stringify({
        url: target.imageUrl,
        relPath: target.relPath || target.imageUrl,
      })
    );

    info("Đang chuyển sang TikTok Dance Studio...");
    router.push(`/tiktok-dance?modelUrl=${encodeURIComponent(target.imageUrl)}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                TikTok Affiliate &bull; Ghép Model &amp; Sản Phẩm AI
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Up ảnh nhân vật &amp; sản phẩm, đổi phong cách nhờ Gemini API, tạo 1 ảnh kết hợp 9:16 mang sang TikTok Dance làm video.
              </p>
            </div>
          </div>
        </div>

        {/* Cloudinary & Gallery Action Bar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <Cloud className="w-4 h-4" />
            <span>Cloudinary: {cloudName} (Folder: tiktok-video &bull; Tự động lưu)</span>
          </div>

          <Link
            href="/gallery"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-colors"
          >
            <FolderHeart className="w-4 h-4 text-primary" />
            <span>Kho Media</span>
          </Link>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Dual Upload & Gemini Style Settings (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Dual Image Upload */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>1. Tải Lên Ảnh Nhân Vật &amp; Ảnh Sản Phẩm</span>
              </h2>
              <span className="text-[11px] text-muted-foreground">Định dạng JPG, PNG, WebP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Box 1: Character Model */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                  <span>Ảnh Nhân Vật (Model)</span>
                  <button
                    type="button"
                    onClick={() => useSampleCharacter("linh")}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Dùng Model mẫu
                  </button>
                </span>

                <div
                  onClick={() => charInputRef.current?.click()}
                  className={`relative aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all overflow-hidden ${
                    characterImage
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/60 hover:bg-secondary/40 bg-secondary/20"
                  }`}
                >
                  <input
                    ref={charInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCharUpload}
                    className="hidden"
                  />

                  {characterImage ? (
                    <>
                      <img
                        src={characterImage}
                        alt="Character Model"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-2">
                        <UploadCloud className="w-6 h-6" />
                        <span className="text-xs font-semibold">Bấm để đổi ảnh khác</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCharacterImage(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Tải ảnh người mẫu</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Khuôn mặt rõ ràng</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Product Image */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                  <span>Ảnh Sản Phẩm (Product)</span>
                  <span className="text-[10px] text-rose-400 font-medium">* Bắt buộc</span>
                </span>

                <div
                  onClick={() => prodInputRef.current?.click()}
                  className={`relative aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all overflow-hidden ${
                    productImage
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-border hover:border-emerald-500/60 hover:bg-secondary/40 bg-secondary/20"
                  }`}
                >
                  <input
                    ref={prodInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProdUpload}
                    className="hidden"
                  />

                  {productImage ? (
                    <>
                      <img
                        src={productImage}
                        alt="Product Item"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-2">
                        <UploadCloud className="w-6 h-6" />
                        <span className="text-xs font-semibold">Bấm để đổi sản phẩm</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductImage(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Tải ảnh sản phẩm</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Quần áo, mỹ phẩm, v.v.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Tên sản phẩm
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ví dụ: Đầm dạ hội bodycon nhung đen..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Cách nhân vật tương tác với SP
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPoseAction("WEARING")}
                    className={`flex items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      poseAction === "WEARING"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Shirt className="w-3 h-3" />
                    <span>Mặc lên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoseAction("HOLDING")}
                    className={`flex items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      poseAction === "HOLDING"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <HandMetal className="w-3 h-3" />
                    <span>Cầm tay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoseAction("SHOWCASING")}
                    className={`flex items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      poseAction === "SHOWCASING"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Gem className="w-3 h-3" />
                    <span>Tạo dáng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Gemini Character Style Transformer */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>2. Biến Hóa Phong Cách Nhân Vật (Gemini API)</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Chọn phong cách tạo hình AI hoặc gõ mô tả tùy chỉnh để Gemini thay đổi outfit, bối cảnh &amp; thần thái.
                </p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STYLE_PRESETS.map((preset) => {
                const isSelected = selectedStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedStyle(preset.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs relative ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/10 shadow-sm shadow-pink-500/10 text-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <span className="text-xl mb-1.5">{preset.icon}</span>
                    <span className="font-bold text-[11px] leading-tight text-foreground line-clamp-1">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                      {preset.description}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-pink-500/30"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Gemini Style Prompt Input */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>Mô tả phong cách tùy biến cho Gemini (Tùy chọn)</span>
                <span className="text-[10px] text-muted-foreground">Prompt cá nhân hóa</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Đứng trong căn hộ penthouse nhìn ra thành phố Tokyo về đêm, ánh đèn neon lung linh, tóc buông xõa bay nhẹ, thần thái kiêu sa..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border focus:border-pink-500 focus:outline-none resize-none"
              />
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              disabled={isGenerating || !characterImage || !productImage}
              onClick={handleGenerateMix}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isGenerating || !characterImage || !productImage
                  ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-gradient-to-r from-pink-600 via-rose-500 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-500/25 active:scale-[0.99]"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Gemini Đang Kết Hợp Nhân Vật &amp; Sản Phẩm (9:16)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Ghép Nhân Vật &amp; Sản Phẩm Bằng Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output: Combined Result Card & Transfer Hub (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Kết Quả Ghép Model (Khung Dọc 9:16)</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ảnh người mẫu chuẩn bị sẵn sàng để mang sang TikTok Dance.
                </p>
              </div>

              {currentResult && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                    currentResult.storageProvider === "CLOUDINARY"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  <span>{currentResult.storageProvider}</span>
                </span>
              )}
            </div>

            {/* 9:16 Result Preview Box */}
            <div className="relative aspect-[9/16] max-h-[520px] mx-auto rounded-2xl bg-black/60 border border-border/80 overflow-hidden flex flex-col items-center justify-center text-center group shadow-xl">
              {currentResult ? (
                <>
                  <img
                    src={currentResult.imageUrl}
                    alt={currentResult.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Overlay Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-sm">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>{currentResult.styleName}</span>
                    </span>

                    <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      9:16 Portrait
                    </span>
                  </div>

                  {/* Bottom Hover Actions */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-2">
                    <div className="text-left text-white max-w-[65%]">
                      <p className="text-xs font-bold truncate">{currentResult.productName}</p>
                      <p className="text-[10px] text-zinc-300 truncate">Sẵn sàng làm video TikTok</p>
                    </div>

                    <a
                      href={currentResult.imageUrl}
                      download={`affiliate_model_${Date.now()}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                      title="Tải ảnh về máy"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="p-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 mx-auto flex items-center justify-center animate-pulse">
                    <Sparkles className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Gemini Đang Ghép Ảnh...</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
                      Đang nhận diện khuôn mặt nhân vật và may đo sản phẩm lên vóc dáng...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary text-muted-foreground mx-auto flex items-center justify-center">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Chưa có ảnh kết quả</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                      Tải ảnh lên và nhấn &quot;Ghép Nhân Vật &amp; Sản Phẩm&quot; để tạo ảnh mới.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Core Action: Transfer To TikTok Dance */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={!currentResult || isGenerating}
                onClick={() => handleTransferToDance()}
                className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  !currentResult || isGenerating
                    ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white shadow-orange-500/25 active:scale-[0.99]"
                }`}
              >
                <Flame className="w-4 h-4 text-yellow-300" />
                <span>Mang Sang TikTok Dance Làm Video Ngay</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <p className="text-[11px] text-center text-muted-foreground">
                Tự động đặt ảnh người mẫu vừa tạo làm nhân vật nhảy trong TikTok Dance Studio.
              </p>
            </div>
          </div>

          {/* Recent Mixed Models Strip */}
          {recentMixes.length > 0 && (
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Ảnh Đã Ghép Gần Đây</span>
                <Link
                  href="/gallery?category=affiliate_mix"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả ({recentMixes.length})</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {recentMixes.map((mix, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentResult(mix)}
                    className={`group relative aspect-[9/16] rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      currentResult?.imageUrl === mix.imageUrl
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={mix.imageUrl} alt={mix.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                      <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded-md">
                        Chọn
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
