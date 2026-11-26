import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { cloudinaryService } from "@/providers/storage/cloudinary.service";
import { galleryService } from "@/modules/media/gallery.service";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const maxDuration = 300; // 5 mins

export const AFFILIATE_STYLE_PRESETS: Record<
  string,
  { name: string; promptModifier: string; icon: string }
> = {
  streetwear_y2k: {
    name: "Streetwear & Y2K Bắt Trend",
    icon: "🔥",
    promptModifier:
      "Trendy Y2K streetwear fashion aesthetic, edgy modern casual outfit, stylish accessories, urban TikTok creator vibe, vibrant saturated lighting.",
  },
  luxury_glam: {
    name: "Sang Trọng & Quý Phái (Luxury Glamour)",
    icon: "✨",
    promptModifier:
      "High-end luxury glamour fashion, elegant evening couture, opulent modern suite setting, soft cinematic golden hour studio lighting, refined graceful pose.",
  },
  kpop_idol: {
    name: "K-Pop Idol / Ulzzang Hàn Quốc",
    icon: "🌸",
    promptModifier:
      "K-pop idol stage fashion, glass skin makeup, trendy Korean ulzzang aesthetic, charming cheerful expression, pastel aesthetic studio lighting.",
  },
  chic_office: {
    name: "Công Sở Thời Thượng (Chic Office / Boss Lady)",
    icon: "💼",
    promptModifier:
      "Chic modern office wear, tailored smart blazer, confident boss lady aesthetic, sleek minimalist architecture background, clean daylight.",
  },
  sporty_fitness: {
    name: "Thể Thao Năng Động (Athleisure / Gym Look)",
    icon: "⚡",
    promptModifier:
      "Athleisure sporty fitness look, modern activewear, fit toned silhouette, energetic vibe, bright sunlit modern gym or outdoor backdrop.",
  },
  studio_commercial: {
    name: "Chụp Hình Thương Mại (Studio Lookbook)",
    icon: "📸",
    promptModifier:
      "Professional commercial lookbook studio photoshoot, clean monochrome studio backdrop, high-key commercial lighting, razor sharp product details.",
  },
  cyberpunk_neon: {
    name: "Cyberpunk & Neon Độc Lạ",
    icon: "🔮",
    promptModifier:
      "Futuristic cyberpunk aesthetic, dramatic neon blue and magenta lighting, high-tech glowing accents, sleek futuristic outfit, cinematic dark ambiance.",
  },
  coquette_cute: {
    name: "Nữ Tính Dễ Thương (Coquette / Pastel Soft)",
    icon: "🎀",
    promptModifier:
      "Soft coquette aesthetic, delicate ribbons, romantic pastel outfit, gentle ethereal soft-focus lighting, dreamy charming fairy-like atmosphere.",
  },
};

// Helper to convert URL or local path to base64
async function resolveImageBase64(
  input: string
): Promise<{ mimeType: string; base64: string }> {
  if (input.startsWith("data:")) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input);
    const arrayBuf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return {
      mimeType: contentType,
      base64: Buffer.from(arrayBuf).toString("base64"),
    };
  }

  // Local media path
  let relativePath = input.replace(/^\/?api\/media\/file\//, "");
  let fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), "media", relativePath);

  if (!existsSync(fullPath)) {
    // Check if directly in cwd
    const altPath = path.join(process.cwd(), relativePath);
    if (existsSync(altPath)) fullPath = altPath;
    else throw new Error(`Không tìm thấy file ảnh tại ${input}`);
  }

  const fileBuf = await fs.readFile(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return {
    mimeType,
    base64: fileBuf.toString("base64"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      characterImage, // Data URL or URL or local path
      productImage, // Data URL or URL or local path
      productName = "Sản phẩm TikTok Affiliate",
      productCategory = "Thời trang",
      stylePreset = "streetwear_y2k",
      customPrompt = "",
      poseAction = "WEARING", // WEARING, HOLDING, SHOWCASING
      geminiApiKey,
    } = body;

    if (!characterImage || !productImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng tải lên cả Ảnh Nhân Vật và Ảnh Sản Phẩm để Gemini kết hợp.",
        },
        { status: 400 }
      );
    }

    const apiKey = (geminiApiKey as string)?.trim() || env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm GEMINI_API_KEY để sử dụng tính năng kết hợp ảnh AI.",
        },
        { status: 400 }
      );
    }

    // Resolve base64 for both images
    const charImgData = await resolveImageBase64(characterImage);
    const prodImgData = await resolveImageBase64(productImage);

    // Build the AI Prompt
    const presetInfo = AFFILIATE_STYLE_PRESETS[stylePreset] || AFFILIATE_STYLE_PRESETS.streetwear_y2k;
    let actionInstruction = "";
    if (poseAction === "WEARING") {
      actionInstruction = `The character is naturally wearing the exact product (${productName}) as an outfit, perfectly tailored to their body proportions.`;
    } else if (poseAction === "HOLDING") {
      actionInstruction = `The character is naturally holding the product (${productName}) in their hands, presenting it towards the camera with a gentle inviting smile.`;
    } else {
      actionInstruction = `The character is stylishly posing alongside the product (${productName}), highlighting its key design elements.`;
    }

    const promptText = `
Generate a single photorealistic, vertical 9:16 portrait combining the person from the Character Reference Image and the item from the Product Reference Image.

PRODUCT DETAILS:
- Name: ${productName}
- Category: ${productCategory}
- Interaction: ${actionInstruction}

STYLE & AESTHETIC:
- Preset: ${presetInfo.name}
- Visual Style: ${presetInfo.promptModifier}
${customPrompt ? `- Custom Requirements: ${customPrompt}` : ""}

STRICT COMPOSITION RULES:
1. FACIAL PRESERVATION: The person in the final photo MUST have the EXACT same facial structure, eye shape, nose, lips, hair color and facial identity as the Character Reference Image.
2. PRODUCT FIDELITY: The product in the final photo MUST replicate the exact color, texture, material, logos, and structure from the Product Reference Image. Do not alter its core design.
3. QUALITY: High-fashion lookbook quality, vertical 9:16 TikTok portrait framing (full-body or three-quarters), sharp focus, natural studio lighting, ultra-detailed fabric and skin textures.
4. NEGATIVE: No watermarks, no distorted fingers, no unnatural hands, no duplicate persons, no blurry artifacts, no cartoon rendering.
`.trim();

    // Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    // Prepare Multimodal Input
    const inputItems: any[] = [
      { type: "text", text: promptText },
      {
        type: "image",
        mime_type: charImgData.mimeType,
        data: charImgData.base64,
      },
      {
        type: "image",
        mime_type: prodImgData.mimeType,
        data: prodImgData.base64,
      },
    ];

    // Call Gemini 2.5 Flash Image with 9:16 aspect ratio
    const interaction = await ai.interactions.create({
      model: "gemini-2.5-flash-image",
      input: inputItems,
      response_format: {
        type: "image",
        aspect_ratio: "9:16",
      },
    });

    const outputImage = interaction.output_image;
    if (!outputImage?.data) {
      throw new Error("Gemini không trả về dữ liệu ảnh. Vui lòng thử lại với mô tả khác.");
    }

    const imageBuffer = Buffer.from(outputImage.data, "base64");
    const isCloudinaryReady = await cloudinaryService.isConfigured();

    let finalImageUrl = "";
    let finalRelPath = "";
    let storageProvider: "CLOUDINARY" | "LOCAL" = "LOCAL";
    let cloudinaryPublicId: string | undefined;

    if (isCloudinaryReady) {
      // Zero-disk: Upload directly to Cloudinary cloud!
      const uploadRes = await cloudinaryService.uploadBuffer(
        imageBuffer,
        "image/png",
        "affiliate_mix",
        `affiliate_${Date.now()}.png`
      );
      finalImageUrl = uploadRes.secureUrl;
      storageProvider = "CLOUDINARY";
      cloudinaryPublicId = uploadRes.publicId;
    } else {
      // Local fallback with notice
      const filename = `affiliate_mix_${Date.now()}.png`;
      const localDir = path.join(process.cwd(), "media", "affiliate-mix");
      if (!existsSync(localDir)) {
        await fs.mkdir(localDir, { recursive: true });
      }
      const fullPath = path.join(localDir, filename);
      await fs.writeFile(fullPath, imageBuffer);
      finalImageUrl = `/api/media/file/affiliate-mix/${filename}`;
      finalRelPath = `affiliate-mix/${filename}`;
      storageProvider = "LOCAL";
    }

    // Register in unified Media Gallery Vault
    const galleryItem = await galleryService.addItem({
      title: `${productName} - Model ${presetInfo.name}`,
      type: "image",
      category: "affiliate_mix",
      url: finalImageUrl,
      thumbnailUrl: finalImageUrl,
      storageProvider,
      cloudinaryPublicId,
      localPath: finalRelPath || undefined,
      fileSize: imageBuffer.length,
      width: 1080,
      height: 1920,
      metadata: {
        productName,
        productCategory,
        stylePreset,
        styleName: presetInfo.name,
        poseAction,
        customPrompt,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      relPath: finalRelPath,
      storageProvider,
      galleryItem,
      message: isCloudinaryReady
        ? "Đã tạo ảnh kết hợp và lưu trên Cloudinary (Không tốn dung lượng máy)!"
        : "Đã tạo ảnh kết hợp thành công (Đang lưu tạm trên máy. Bạn có thể kết nối Cloudinary trong Kho Media).",
    });
  } catch (err: any) {
    console.error("Lỗi tạo ảnh Affiliate Mix:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Không thể kết hợp ảnh nhân vật và sản phẩm qua Gemini.",
      },
      { status: 500 }
    );
  }
}
