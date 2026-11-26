import { prisma } from "@/lib/db";
import { geminiProvider } from "@/providers/ai/gemini.provider";
import { evaluateClaimGuard } from "./claim-guard";
import { CreativeStatus, PromptType, ProductStatus } from "@prisma/client";

export class CreativeService {
  async getCreatives(filter?: { creatorId?: string; productId?: string; status?: CreativeStatus }) {
    return await prisma.creative.findMany({
      where: {
        creatorId: filter?.creatorId,
        productId: filter?.productId,
        status: filter?.status,
      },
      include: {
        creator: true,
        product: {
          include: { images: true },
        },
        timelines: {
          orderBy: { orderIndex: "asc" },
        },
        prompts: true,
        assets: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCreativeById(id: string) {
    return await prisma.creative.findUnique({
      where: { id },
      include: {
        creator: {
          include: { referenceImages: true, voiceProfiles: true },
        },
        product: {
          include: { images: true, analyses: { take: 1, orderBy: { version: "desc" } } },
        },
        timelines: {
          orderBy: { orderIndex: "asc" },
        },
        prompts: {
          include: { versions: { orderBy: { version: "desc" } } },
        },
        assets: {
          include: { versions: { orderBy: { version: "desc" } } },
          orderBy: { createdAt: "desc" },
        },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });
  }

  async generateCreativesForProduct(productId: string, creatorNameOverride?: "LINH" | "NAM") {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        analyses: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!product || product.analyses.length === 0) {
      throw new Error(
        "Sản phẩm chưa có kết quả phân tích AI. Vui lòng bấm 'Phân tích sản phẩm' trước khi tạo kịch bản."
      );
    }

    const latestAnalysis = product.analyses[0];

    // Determine target creator
    let targetCreatorName: "LINH" | "NAM" = "LINH";
    if (creatorNameOverride) {
      targetCreatorName = creatorNameOverride;
    } else if (latestAnalysis.recommendedCreator === "NAM") {
      targetCreatorName = "NAM";
    }

    const creator = await prisma.virtualCreator.findUnique({
      where: { name: targetCreatorName },
    });

    if (!creator) {
      throw new Error(`Không tìm thấy Virtual Creator: ${targetCreatorName}`);
    }

    // Call Gemini to generate 3 concepts
    const generated = await geminiProvider.generateCreatives({
      productName: product.name,
      category: product.category,
      description: product.description,
      features: product.features,
      verifiedClaims: product.verifiedClaims,
      analysis: latestAnalysis as any,
      creatorName: targetCreatorName,
      creatorStyle: creator.description,
    });

    const createdCreatives = [];

    for (const concept of generated.concepts) {
      // Evaluate Claim Guard
      const claimReport = evaluateClaimGuard(concept, product.verifiedClaims);

      // Generate Image Prompt for ChatGPT
      const chatGptImagePrompt = `
Clean original vertical social-media UGC source photo of Vietnamese creator ${creator.name} (${creator.ageStyle} years old).
Creator identity appearance: ${creator.masterAppearancePrompt}
Creator is holding and demonstrating the actual product: "${product.name}".
Product description & features: ${product.description}.
Action: Creator naturally testing the product in a real home setting, realistic natural lighting, realistic hands, authentic smartphone camera quality, 9:16 vertical aspect ratio.
The source image must be clean and original: no watermark, no TikTok logo, no username or handle, no caption, no social-media UI, no text overlay, no stickers, no brand logo.
Negative prompt: ${creator.negativePrompt}, watermark, TikTok logo, username, handle, caption, social-media interface, text overlay, sticker, brand logo.
`.trim();

      // Generate Video Prompt for Gemini/Veo
      const spokenLines = concept.timeline
        .map(
          (item) =>
            `- ${item.start} to ${item.end}s: Speak exactly in Vietnamese: "${item.voice}"`
        )
        .join("\n");
      const voiceDescription =
        creator.gender === "FEMALE"
          ? "a warm, natural Vietnamese female voice"
          : "a warm, natural Vietnamese male voice";
      const veoVideoPrompt = `
Clean original vertical social-media UGC source footage, 10-12 seconds, 9:16 aspect ratio. Do not imitate or reproduce an existing TikTok video.
Model: Vietnamese creator ${creator.name}, natural facial features, consistent character identity.
Setting: Casual modern realistic indoor environment.
Scene breakdown:
- 0 to 2s: ${concept.timeline[0]?.visual || "Hook moment with product"}
- 2 to 7s: ${concept.timeline[1]?.visual || "Hands naturally demonstrating product in action"}
- 7 to 10s: ${concept.timeline[2]?.visual || "Clear satisfied reaction and visible product result"}
- 10 to 12s: ${concept.timeline[3]?.visual || "Creator holding product smiling naturally"}

Native audio: Generate synchronized spoken dialogue in ${voiceDescription}; natural conversational delivery, clean Vietnamese pronunciation, and realistic room tone. Speak the following lines at their exact timestamps:
${spokenLines}
No background music louder than the voice. Do not add any other speech, English speech, narration, captions, or sound effects that obscure the dialogue.

Crucial constraints: Keep product dimensions exact. Realistic natural hands with exactly 5 fingers. No logo morphing, no text renders, no background warping. Absolutely no watermark, TikTok logo, username, handle, caption, social-media UI, sticker, brand logo, or any text anywhere in the frame.
`.trim();

      const creative = await prisma.creative.create({
        data: {
          productId: product.id,
          creatorId: creator.id,
          hook: concept.hook,
          hookType: concept.hookType,
          angle: concept.angle,
          durationSec: concept.durationSec,
          caption: concept.caption,
          hashtags: concept.hashtags,
          cta: concept.cta,
          contentIntent: concept.contentIntent,
          claimGuardStatus: claimReport.status,
          claimGuardReport: claimReport as unknown as object,
          status: CreativeStatus.CONCEPT_APPROVED,
          timelines: {
            create: concept.timeline.map((item, idx) => ({
              startSec: item.start,
              endSec: item.end,
              visualDesc: item.visual,
              voiceText: item.voice,
              overlayText: item.overlay || null,
              orderIndex: idx,
            })),
          },
          versions: {
            create: {
              version: 1,
              snapshot: concept as unknown as object,
              reason: "Khởi tạo concept kịch bản ban đầu",
            },
          },
          prompts: {
            create: [
              {
                type: PromptType.IMAGE_MODEL_PRODUCT,
                content: chatGptImagePrompt,
                version: 1,
                versions: {
                  create: {
                    content: chatGptImagePrompt,
                    version: 1,
                  },
                },
              },
              {
                type: PromptType.VIDEO_VEO_GEMINI,
                content: veoVideoPrompt,
                version: 1,
                versions: {
                  create: {
                    content: veoVideoPrompt,
                    version: 1,
                  },
                },
              },
            ],
          },
        },
        include: {
          timelines: true,
          prompts: true,
        },
      });

      createdCreatives.push(creative);
    }

    // Auto transition product to TESTING if it is currently CANDIDATE
    if (product.status === ProductStatus.CANDIDATE) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.TESTING },
      });
    }

    return createdCreatives;
  }
}

export const creativeService = new CreativeService();
