"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Clapperboard,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

function NewProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");

  // Form State
  // Never prefill a real submission form with unrelated demo data: those values
  // are sent to Gemini and can silently contaminate the product analysis.
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [verifiedClaims, setVerifiedClaims] = useState<string[]>([]);
  const [sellerInfo, setSellerInfo] = useState("");

  // Uploaded images state (Array of local paths)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Flow State
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatingCreatives, setGeneratingCreatives] = useState(false);
  const [error, setError] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (!productIdParam) return;
    setLoadingExisting(true);
    fetch(`/api/products/${productIdParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.product) {
          const p = data.product;
          setSavedProductId(p.id);
          setName(p.name || "");
          setCategory(p.category || "");
          setUrl(p.url || "");
          setPrice(p.price ? String(p.price) : "");
          setCommissionRate(p.commissionRate ? String(p.commissionRate) : "");
          setDescription(p.description || "");
          setFeatures(Array.isArray(p.features) ? p.features : []);
          setVerifiedClaims(Array.isArray(p.verifiedClaims) ? p.verifiedClaims : []);
          setSellerInfo(p.sellerInfo || "");
          if (p.images && p.images.length > 0) {
            setImageUrls(p.images.map((img: any) => img.localPath));
          }
          if (p.analyses && p.analyses.length > 0) {
            setAnalysisResult({
              analysis: p.analyses[0].analysisData,
              score: p.score,
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load existing product", err);
      })
      .finally(() => {
        setLoadingExisting(false);
      });
  }, [productIdParam]);

  useEffect(() => {
    const productId = searchParams.get("productId");
    if (!productId) return;

    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể tải sản phẩm");
        const product = data.product;
        setName(product.name);
        setCategory(product.category);
        setUrl(product.url || "");
        setPrice(product.price ? String(product.price) : "");
        setCommissionRate(product.commissionRate !== null ? String(product.commissionRate) : "");
        setDescription(product.description);
        setFeatures(product.features || []);
        setVerifiedClaims(product.verifiedClaims || []);
        setSellerInfo(product.sellerInfo || "");
        setImageUrls(product.images.map((image: { localPath: string }) => image.localPath));
        setSavedProductId(product.id);
        if (product.analyses?.[0] && product.score) {
          setAnalysisResult({ analysis: product.analyses[0], scores: product.score });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Không thể tải chi tiết sản phẩm");
      }
    };

    loadProduct();
  }, [searchParams]);

  // Handle uploading product image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subFolder", "products");

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setImageUrls((prev) => [...prev, data.localPath]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step 1: Save Product & Run Analysis
  const handleAnalyze = async () => {
    if (imageUrls.length < 3) {
      setError("Vui lòng tải lên tối thiểu 3 ảnh thật của sản phẩm.");
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      const productPayload = {
        name,
        category,
        url: url || undefined,
        price: price ? Number(price) : undefined,
        commissionRate: commissionRate ? Number(commissionRate) : undefined,
        description,
        features,
        verifiedClaims,
        sellerInfo,
        imageUrls,
      };

      // 1. Create a new product, or persist all edits to an existing product.
      let pId = savedProductId;
      if (!pId) {
        const createRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        });

        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error);
        pId = createData.product.id;
        setSavedProductId(pId);
      } else {
        const updateRes = await fetch(`/api/products/${pId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error(updateData.error);
      }

      // 2. Call Gemini Product Analyst
      const analyzeRes = await fetch(`/api/products/${pId}/analyze`, {
        method: "POST",
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error);

      setAnalysisResult(analyzeData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Phân tích thất bại");
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Generate 3 Creatives
  const handleGenerateCreatives = async () => {
    if (!savedProductId) return;

    setGeneratingCreatives(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${savedProductId}/creatives/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: analysisResult?.analysis?.recommendedCreator === "NAM" ? "NAM" : "LINH",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/content`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sinh kịch bản thất bại");
    } finally {
      setGeneratingCreatives(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <span>Thêm &amp; Phân Tích Sản Phẩm Mới</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Nhập thông tin sản phẩm và ảnh thực tế để kích hoạt Gemini Product Analyst đánh giá mức độ tương thích với kênh và sinh 3 concept kịch bản.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-foreground mb-1">
              Tên sản phẩm *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Tính năng nổi bật
            </label>
            <textarea
              rows={4}
              value={features.join("\n")}
              onChange={(e) => setFeatures(e.target.value.split("\n").map((value) => value.trim()).filter(Boolean))}
              placeholder="Mỗi dòng một tính năng, ví dụ: Vải cotton co giãn 4 chiều"
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Claim đã xác thực
            </label>
            <textarea
              rows={4}
              value={verifiedClaims.join("\n")}
              onChange={(e) => setVerifiedClaims(e.target.value.split("\n").map((value) => value.trim()).filter(Boolean))}
              placeholder="Mỗi dòng một claim có thể chứng minh; không điền nếu chưa có"
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-foreground mb-1">
              Thông tin shop / nguồn (tuỳ chọn)
            </label>
            <input
              type="text"
              value={sellerInfo}
              onChange={(e) => setSellerInfo(e.target.value)}
              placeholder="Ví dụ: DAZZI Official Store"
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Danh mục (Category) *
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              URL TikTok Shop / Nguồn sản phẩm
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Giá bán (VND)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Hoa hồng Affiliate dự kiến (%)
            </label>
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-foreground mb-1">
              Mô tả chi tiết sản phẩm *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
            />
          </div>
        </div>

        {/* Product Images (3-8 images) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-bold text-foreground">
                Ảnh thực tế sản phẩm (3 - 8 ảnh) *
              </label>
              <p className="text-[11px] text-muted-foreground">
                Dùng làm tư liệu cho ChatGPT tạo ảnh Creator cầm sản phẩm và Veo tạo video demo.
              </p>
            </div>
            <span className="text-xs font-mono text-primary font-bold">
              {imageUrls.length} ảnh đã chọn
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-3">
            {imageUrls.map((img, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-xl border border-border bg-secondary/60 relative overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/file/${img}`}
                  alt={`Product ${idx}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="p-1.5 rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">
                    Chính
                  </span>
                )}
              </div>
            ))}

            <label
              htmlFor="prod-img"
              className={`aspect-square rounded-xl border border-dashed border-border hover:border-primary/50 bg-secondary/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                uploadingImage ? "opacity-50" : ""
              }`}
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium text-center px-1">
                {uploadingImage ? "Đang tải..." : "+ Thêm ảnh"}
              </span>
              <input
                id="prod-img"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Action Button: PHÂN TÍCH SẢN PHẨM */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
            <span>{analyzing ? "Gemini 3.8 Flash Đang Phân Tích..." : "PHÂN TÍCH SẢN PHẨM"}</span>
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="p-6 rounded-2xl bg-card border border-primary/30 shadow-xl space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base">Kết Quả Phân Tích Gemini Product Analyst</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                OVERALL SCORE: {analysisResult.scores.overallScore}/10
              </span>
            </div>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 border border-border text-center">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">Demo Trực Quan</div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {analysisResult.scores.visualScore}/10
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-border text-center">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">Độ Hợp Kênh</div>
              <div className="text-xl font-bold text-primary mt-0.5">
                {analysisResult.scores.accountFitScore}/10
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-border text-center">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">Xu Hướng Trend</div>
              <div className="text-xl font-bold text-indigo-400 mt-0.5">
                {analysisResult.scores.trendScore}/10
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-border text-center">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">Tiềm Năng Affiliate</div>
              <div className="text-xl font-bold text-amber-500 mt-0.5">
                {analysisResult.scores.commercialScore}/10
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <span className="font-bold text-foreground">Creator Đề Xuất:</span>
              <p className="text-primary font-bold text-sm">
                {analysisResult.analysis.recommendedCreator}
              </p>

              <span className="font-bold text-foreground block pt-2">Khán giả mục tiêu:</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {analysisResult.analysis.targetAudience.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <span className="font-bold text-foreground">Nỗi đau giải quyết (Pain Points):</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {analysisResult.analysis.painPoints.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>

              <span className="font-bold text-foreground block pt-2">Góc nội dung gợi ý:</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {analysisResult.analysis.recommendedContentAngles.map((angle: string, i: number) => (
                  <li key={i}>{angle}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next Step Action: Sinh 3 Concept Kịch Bản */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Sản phẩm đã được chấm điểm và lưu vào cơ sở dữ liệu. Tiếp theo: Tạo 3 kịch bản độc lập.
            </p>
            <button
              type="button"
              onClick={handleGenerateCreatives}
              disabled={generatingCreatives}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <Clapperboard className="w-4 h-4" />
              <span>{generatingCreatives ? "Đang Sinh Kịch Bản..." : "Sinh 3 Concept Kịch Bản"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-16 text-center text-xs text-muted-foreground">
          Đang tải thông tin sản phẩm...
        </div>
      }
    >
      <NewProductForm />
    </Suspense>
  );
}
