"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  UploadCloud,
  Trash2,
  RotateCw,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Eye,
  Check,
  Plus,
  X,
  VolumeX,
  Film,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { CharacterReferenceType } from "@prisma/client";

interface ReferenceAsset {
  id: string;
  referenceType: CharacterReferenceType;
  localPath: string;
  mimeType: string;
  approved: boolean;
  version: number;
  metadata?: any;
}

interface CharacterItem {
  id: string;
  name: string;
  role: string;
  ageDescription?: string | null;
  appearanceLock: string;
  outfitLock: string;
  personality?: string | null;
  voiceRule: string;
  colorPalette?: any;
  masterPrompt: string;
  negativePrompt: string;
  safetyRules?: string | null;
  status: string;
  referenceAssets: ReferenceAsset[];
  checklist?: {
    approvedCount: number;
    totalCount: number;
    missingRequiredTypes: string[];
    isComplete: boolean;
  };
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  FULL_BODY_FRONT: "Toàn thân chính diện",
  FULL_BODY_THREE_QUARTER: "Toàn thân 3/4",
  FULL_BODY_BACK: "Toàn thân phía sau",
  EXPRESSION: "Biểu cảm (Vui/Buồn/Ngạc nhiên...)",
  BASIC_POSE: "Tư thế cơ bản",
  GROUP_HEIGHT_SHEET: "Group Sheet (Khóa chiều cao)",
};

export default function CharacterBiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: seriesId } = use(params);
  const { success, error, info } = useToast();
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadRefType, setUploadRefType] = useState<CharacterReferenceType>(
    CharacterReferenceType.FULL_BODY_FRONT
  );
  const [isUploading, setIsUploading] = useState(false);

  // High-res preview modal state
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Copy state
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const fetchCharacters = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/animation/series/${seriesId}/characters`);
      const data = await res.json();
      if (data.success && data.characters.length > 0) {
        setCharacters(data.characters);
        if (!selectedCharId) {
          setSelectedCharId(data.characters[0].id);
        }
      }
    } catch {
      error("Không thể tải danh sách nhân vật");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, [seriesId]);

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    success(`Đã sao chép ${sectionName} vào clipboard!`);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleCopyReferencePack = async () => {
    if (!activeChar) return;
    try {
      const res = await fetch(`/api/animation/characters/${activeChar.id}/reference-pack`);
      const data = await res.json();
      if (data.success) {
        navigator.clipboard.writeText(data.packText);
        success("Đã copy toàn bộ Reference Pack của " + activeChar.name);
      }
    } catch {
      error("Không thể copy Reference Pack");
    }
  };

  const [isSyncingPrompts, setIsSyncingPrompts] = useState(false);

  const handleSyncAllPrompts = async () => {
    try {
      setIsSyncingPrompts(true);
      info("Đang đồng bộ prompt 30 tập theo tạo hình nhân vật khóa...", "Đang xử lý");
      const res = await fetch(`/api/animation/series/${seriesId}/sync-prompts`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đồng bộ thất bại");
      success(data.message, "Đã đồng bộ tạo hình");
    } catch (err: any) {
      error(err.message || "Lỗi đồng bộ prompt");
    } finally {
      setIsSyncingPrompts(false);
    }
  };

  const handleUploadRef = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChar) return;

    try {
      setIsUploading(true);
      info("Đang tải lên ảnh tham chiếu...", "Đang xử lý");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("referenceType", uploadRefType);

      const res = await fetch(`/api/animation/characters/${activeChar.id}/references`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải lên thất bại");
      }

      success("Tải lên ảnh tham chiếu thành công!");
      setIsUploadOpen(false);
      fetchCharacters();
    } catch (err: any) {
      error(err.message || "Tải lên thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleApproval = async (assetId: string, currentApproved: boolean) => {
    try {
      const res = await fetch(`/api/animation/character-references/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !currentApproved }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");

      success(
        !currentApproved ? "Đã duyệt ảnh (APPROVED)!" : "Đã chuyển về bản nháp (DRAFT)"
      );
      fetchCharacters();
    } catch (err: any) {
      error(err.message || "Thao tác thất bại");
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ảnh tham chiếu này?")) return;
    try {
      const res = await fetch(`/api/animation/character-references/${assetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xóa thất bại");
      success("Đã xóa ảnh tham chiếu");
      fetchCharacters();
    } catch (err: any) {
      error(err.message || "Xóa thất bại");
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm font-medium">Đang tải Character Bible...</p>
      </div>
    );
  }

  if (!activeChar) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Chưa có nhân vật nào</h2>
        <Link
          href={`/animation/series/${seriesId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-semibold hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Về Series
        </Link>
      </div>
    );
  }

  const isBiBo = activeChar.name.toLowerCase().includes("bí bo");
  const approvedRefs = activeChar.referenceAssets.filter((a) => a.approved);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/animation" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Film className="w-3.5 h-3.5" />
          <span>Animation Studio</span>
        </Link>
        <span>/</span>
        <Link href={`/animation/series/${seriesId}`} className="hover:text-foreground transition-colors">
          Series
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Character Bible</span>
      </div>

      {/* Top Header & Character Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Character Bible — Khóa Tạo Hình Nhân Vật
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quy chuẩn cố định cho 4 nhân vật Xóm Mít Na. Ảnh tham chiếu được duyệt (APPROVED) ưu tiên cao hơn prompt chữ.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncAllPrompts}
            disabled={isSyncingPrompts}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-purple-600/25 disabled:opacity-50 active:scale-95"
            title="Đồng bộ tất cả 120 cảnh của 30 tập phim theo quy chuẩn tạo hình nhân vật đã khóa"
          >
            <RotateCw className={`w-4 h-4 ${isSyncingPrompts ? "animate-spin" : ""}`} />
            <span>{isSyncingPrompts ? "Đang đồng bộ..." : "Đồng Bộ Prompt 30 Tập Phim"}</span>
          </button>

          <button
            onClick={handleCopyReferencePack}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Reference Pack ({activeChar.name})</span>
          </button>
        </div>
      </div>

      {/* Character Selection Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 border-b border-border">
        {characters.map((c) => {
          const isSelected = c.id === activeChar.id;
          const approvedCount = c.referenceAssets.filter((a) => a.approved).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCharId(c.id)}
              className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
                isSelected
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-t-xl"
              }`}
            >
              <span>{c.name}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  approvedCount > 0
                    ? "bg-emerald-500/15 text-emerald-400 font-bold"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {approvedCount} approved
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Character Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Character Profile & Prompts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Character Header Banner */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {activeChar.referenceAssets.length > 0 && (() => {
                  const mainAsset =
                    activeChar.referenceAssets.find((a) => a.approved) ||
                    activeChar.referenceAssets[0];
                  return (
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: `/api/media/file/${mainAsset.localPath}`,
                          title: `${activeChar.name} - ${
                            REFERENCE_TYPE_LABELS[mainAsset.referenceType] ||
                            mainAsset.referenceType
                          }`,
                          subtitle: `${activeChar.role} • v${mainAsset.version} • ${
                            mainAsset.approved ? "APPROVED" : "DRAFT"
                          }`,
                        })
                      }
                      className="relative group w-20 h-20 rounded-2xl bg-secondary/80 border-2 border-primary/40 overflow-hidden shrink-0 cursor-pointer shadow-md hover:border-primary transition-all flex items-center justify-center"
                      title="Bấm vào để xem ảnh phóng to"
                    >
                      <img
                        src={`/api/media/file/${mainAsset.localPath}`}
                        alt={activeChar.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {activeChar.role}
                  </span>
                  <h2 className="text-2xl font-black text-foreground mt-0.5">
                    {activeChar.name}
                  </h2>
                  {activeChar.ageDescription && (
                    <p className="text-xs text-muted-foreground">
                      Độ tuổi / vóc dáng: {activeChar.ageDescription}
                    </p>
                  )}
                </div>
              </div>

              {isBiBo && (
                <div className="px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2 shrink-0">
                  <VolumeX className="w-4 h-4" />
                  <span>KHÔNG THOẠI TIẾNG NGƯỜI (NONVERBAL)</span>
                </div>
              )}
            </div>

            {/* Color Palette */}
            {activeChar.colorPalette && Array.isArray(activeChar.colorPalette) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">Bảng màu:</span>
                <div className="flex items-center gap-2">
                  {activeChar.colorPalette.map((hex: string) => (
                    <div
                      key={hex}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-[11px] font-mono"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span>{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Locks Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2 text-primary">
                <Sparkles className="w-4 h-4" />
                Khóa Ngoại Hình (Appearance Lock)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeChar.appearanceLock}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2 text-indigo-400">
                <Users className="w-4 h-4" />
                Khóa Trang Phục (Outfit Lock)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeChar.outfitLock}
              </p>
            </div>
          </div>

          {/* Voice Rule */}
          <div className={`p-5 rounded-2xl border ${
            isBiBo
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-border bg-card/60"
          } space-y-2`}>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              {isBiBo ? (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              Quy Tắc Giọng / Âm Thanh
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeChar.voiceRule}
            </p>
          </div>

          {/* Master Prompt & Negative Prompt */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Master Prompt (Chuẩn CGI 3D Tiếng Anh)
              </h4>
              <button
                onClick={() => handleCopy(activeChar.masterPrompt, "Master Prompt")}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                {copiedSection === "Master Prompt" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === "Master Prompt" ? "Đã chép" : "Sao chép"}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/40 font-mono text-xs text-foreground leading-relaxed border border-border select-all">
              {activeChar.masterPrompt}
            </div>

            <div className="flex items-center justify-between pt-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Negative Prompt Khóa
              </h4>
              <button
                onClick={() => handleCopy(activeChar.negativePrompt, "Negative Prompt")}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                {copiedSection === "Negative Prompt" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === "Negative Prompt" ? "Đã chép" : "Sao chép"}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/40 font-mono text-xs text-muted-foreground leading-relaxed border border-border select-all">
              {activeChar.negativePrompt}
            </div>
          </div>
        </div>

        {/* Right Col: Reference Checklist & Assets Gallery */}
        <div className="space-y-6">
          {/* Reference Checklist Card */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Checklist Ảnh Tham Chiếu
              </h3>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Ảnh</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bắt buộc có ít nhất 1 ảnh đã duyệt (APPROVED) trước khi tạo prompt video từng cảnh.
            </p>

            {/* Checklist View List */}
            <div className="space-y-2 pt-2">
              {Object.entries(REFERENCE_TYPE_LABELS).map(([typeKey, label]) => {
                const assetsForType = activeChar.referenceAssets.filter(
                  (a) => a.referenceType === typeKey
                );
                const hasApproved = assetsForType.some((a) => a.approved);
                const hasDraft = assetsForType.length > 0;

                return (
                  <div
                    key={typeKey}
                    className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{label}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {assetsForType.length} ảnh đã nạp
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        hasApproved
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : hasDraft
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-destructive/10 text-destructive/80 border border-destructive/20"
                      }`}
                    >
                      {hasApproved ? "Approved" : hasDraft ? "Chờ duyệt" : "Thiếu"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reference Assets Gallery */}
          <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
              <span>Thư viện Ảnh Tham Chiếu ({activeChar.referenceAssets.length})</span>
            </h3>

            {activeChar.referenceAssets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                <UploadCloud className="w-6 h-6 mx-auto text-muted-foreground" />
                <p>Chưa có ảnh tham chiếu nào được tải lên cho {activeChar.name}.</p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80"
                >
                  Upload ảnh đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChar.referenceAssets.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: `/api/media/file/${ref.localPath}`,
                            title: `${activeChar.name} - ${
                              REFERENCE_TYPE_LABELS[ref.referenceType] || ref.referenceType
                            }`,
                            subtitle: `Phiên bản v${ref.version} • ${
                              ref.approved ? "APPROVED (Đã duyệt)" : "DRAFT (Bản nháp)"
                            }`,
                          })
                        }
                        className="relative group w-14 h-14 rounded-xl bg-black/40 border border-border overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-primary transition-all shadow-sm"
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={`/api/media/file/${ref.localPath}`}
                          alt={ref.referenceType}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-xs text-foreground block">
                          {REFERENCE_TYPE_LABELS[ref.referenceType] || ref.referenceType}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>v{ref.version}</span>
                          <span>&bull;</span>
                          <span
                            className={ref.approved ? "text-emerald-400 font-bold" : "text-amber-400"}
                          >
                            {ref.approved ? "APPROVED" : "DRAFT"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          setPreviewImage({
                            url: `/api/media/file/${ref.localPath}`,
                            title: `${activeChar.name} - ${
                              REFERENCE_TYPE_LABELS[ref.referenceType] || ref.referenceType
                            }`,
                            subtitle: `Phiên bản v${ref.version} • ${
                              ref.approved ? "APPROVED (Đã duyệt)" : "DRAFT (Bản nháp)"
                            }`,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Xem ảnh phóng to"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>

                      <button
                        onClick={() => handleToggleApproval(ref.id, ref.approved)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          ref.approved
                            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {ref.approved ? "Hủy duyệt" : "Duyệt"}
                      </button>

                      <button
                        onClick={() => handleDeleteAsset(ref.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Reference Image Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Upload Ảnh Tham Chiếu ({activeChar.name})
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Chọn góc / loại ảnh tham chiếu:
                </label>
                <select
                  value={uploadRefType}
                  onChange={(e) => setUploadRefType(e.target.value as CharacterReferenceType)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  {Object.entries(REFERENCE_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer relative bg-secondary/30">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadRef}
                  disabled={isUploading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-xs font-semibold text-foreground">
                    {isUploading ? "Đang tải ảnh lên..." : "Kéo thả hoặc nhấp chọn ảnh"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP tối đa 15MB</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Character Reference Preview Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-card/95 border border-border rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  {previewImage.title}
                </h3>
                {previewImage.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{previewImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/70 flex items-center justify-center max-h-[70vh] border border-border/60 p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[66vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Mở ảnh gốc độ phân giải cao trong tab mới</span>
                <span>&rarr;</span>
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
