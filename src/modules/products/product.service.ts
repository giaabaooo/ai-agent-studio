import { prisma } from "@/lib/db";
import { CreateProductInput } from "@/lib/schemas/product.schema";
import { geminiProvider } from "@/providers/ai/gemini.provider";
import { calculateProductScore } from "@/lib/scoring/product-scoring";
import { ProductStatus } from "@prisma/client";

export class ProductService {
  async getProducts(status?: ProductStatus) {
    return await prisma.product.findMany({
      where: status ? { status } : undefined,
      include: {
        images: true,
        score: true,
        analyses: {
          orderBy: { version: "desc" },
          take: 1,
        },
        _count: {
          select: { creatives: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        score: true,
        analyses: {
          orderBy: { version: "desc" },
        },
        creatives: {
          include: {
            creator: true,
            timelines: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async createProduct(input: CreateProductInput) {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        category: input.category,
        url: input.url || null,
        price: input.price ? input.price : null,
        commissionRate: input.commissionRate ? input.commissionRate : null,
        description: input.description,
        features: input.features,
        verifiedClaims: input.verifiedClaims,
        sellerInfo: input.sellerInfo || null,
        status: ProductStatus.CANDIDATE,
        images: {
          create: input.imageUrls.map((url, idx) => ({
            localPath: url,
            isPrimary: idx === 0,
          })),
        },
        candidateRecord: {
          create: {
            priorityOrder: 0,
          },
        },
      },
      include: {
        images: true,
      },
    });

    return product;
  }

  async updateProduct(productId: string, input: CreateProductInput) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        category: input.category,
        url: input.url || null,
        price: input.price || null,
        commissionRate: input.commissionRate ?? null,
        description: input.description,
        features: input.features,
        verifiedClaims: input.verifiedClaims,
        sellerInfo: input.sellerInfo || null,
        images: {
          deleteMany: {},
          create: input.imageUrls.map((localPath, index) => ({
            localPath,
            isPrimary: index === 0,
          })),
        },
      },
      include: { images: true },
    });
  }

  async analyzeProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        analyses: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    const currentVersion = (product.analyses[0]?.version || 0) + 1;

    // Call Gemini AI Provider
    const analysis = await geminiProvider.analyzeProduct({
      name: product.name,
      category: product.category,
      description: product.description,
      features: product.features,
      verifiedClaims: product.verifiedClaims,
      price: product.price ? Number(product.price) : undefined,
    });

    // Save Analysis Record
    const savedAnalysis = await prisma.productAnalysis.create({
      data: {
        productId: product.id,
        version: currentVersion,
        targetAudience: analysis.targetAudience,
        painPoints: analysis.painPoints,
        purchaseMotivations: analysis.purchaseMotivations,
        keyFeatures: analysis.keyFeatures,
        safeClaims: analysis.safeClaims,
        riskClaims: analysis.riskClaims,
        recommendedCreator: analysis.recommendedCreator,
        recommendedContentAngles: analysis.recommendedContentAngles,
        visualDemonstrability: analysis.visualDemonstrability,
        accountFit: analysis.accountFit,
        riskLevel: analysis.riskLevel,
        rawAiResponse: analysis as unknown as object,
      },
    });

    // Deterministic Product Scoring
    const scoreFactors = calculateProductScore(
      analysis,
      product.commissionRate !== null,
      product.price ? Number(product.price) : undefined
    );

    await prisma.productScore.upsert({
      where: { productId: product.id },
      update: {
        visualScore: scoreFactors.visualScore,
        accountFitScore: scoreFactors.accountFitScore,
        trendScore: scoreFactors.trendScore,
        commercialScore: scoreFactors.commercialScore,
        overallScore: scoreFactors.overallScore,
      },
      create: {
        productId: product.id,
        visualScore: scoreFactors.visualScore,
        accountFitScore: scoreFactors.accountFitScore,
        trendScore: scoreFactors.trendScore,
        commercialScore: scoreFactors.commercialScore,
        overallScore: scoreFactors.overallScore,
      },
    });

    await prisma.productScoreHistory.create({
      data: {
        productId: product.id,
        overallScore: scoreFactors.overallScore,
        factors: scoreFactors as unknown as object,
      },
    });

    // Auto lifecycle transition upon analysis
    if (analysis.riskLevel === "HIGH" || scoreFactors.overallScore < 5.0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.REJECTED },
      });
    }

    return {
      analysis: savedAnalysis,
      scores: scoreFactors,
    };
  }

  async evaluateProductLifecycle(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        score: true,
        analyses: { orderBy: { version: "desc" }, take: 1 },
        creatives: {
          include: {
            assets: true,
            publication: { include: { metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
          },
        },
      },
    });

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    const previousStatus = product.status;
    let newStatus: ProductStatus = product.status;
    let reason = "";

    const latestAnalysis = product.analyses[0];
    const score = product.score;
    const creativesCount = product.creatives.length;

    // A Publication is created when a draft is sent to TikTok Inbox, so it does
    // not by itself prove that the video is public. The sync flow fills
    // tikTokVideoId only after the video is present in the account's video list.
    const publishedCreatives = product.creatives.filter(
      (c) => c.status === "PUBLISHED" || Boolean(c.publication?.tikTokVideoId)
    );
    const hasFinalVideos = product.creatives.some((c) =>
      c.assets.some((a) => a.type === "FINAL_VIDEO")
    );

    if (latestAnalysis?.riskLevel === "HIGH" || (score && score.overallScore < 5.0)) {
      newStatus = ProductStatus.REJECTED;
      reason = `AI từ chối sản phẩm do ${
        latestAnalysis?.riskLevel === "HIGH"
          ? "mức độ rủi ro vi phạm chính sách TikTok Shop cao (Claim Guard High Risk)"
          : `điểm tiềm năng tổng thể thấp (${score?.overallScore || 0}/10)`
      }.`;
    } else if (publishedCreatives.length >= 2 || (publishedCreatives.length >= 1 && hasFinalVideos)) {
      const totalViews = publishedCreatives.reduce((sum, c) => {
        const snap = c.publication?.metricSnapshots?.[0];
        return sum + (snap?.views || 0);
      }, 0);

      if (totalViews >= 10000 || publishedCreatives.length >= 2) {
        newStatus = ProductStatus.WINNER;
        reason = `AI thăng hạng sản phẩm thành WINNER nhờ có ${publishedCreatives.length} video đã xuất bản và đạt tương tác tốt (${totalViews.toLocaleString()} views).`;
      } else {
        newStatus = ProductStatus.TESTING;
        reason = `Sản phẩm đang trong giai đoạn TESTING (${publishedCreatives.length} video đã đăng tải, đang thu thập thêm số liệu chuyển đổi).`;
      }
    } else if (creativesCount > 0 || hasFinalVideos) {
      newStatus = ProductStatus.TESTING;
      reason = `AI tự động chuyển sản phẩm sang TESTING vì đã tạo ${creativesCount} kịch bản nội dung và đang trong quy trình sản xuất video thử nghiệm.`;
    } else {
      newStatus = ProductStatus.CANDIDATE;
      reason = score
        ? `Sản phẩm đang ở trạng thái CANDIDATE với điểm tiềm năng ${score.overallScore}/10. Hãy tạo kịch bản để AI tự động chuyển sang TESTING.`
        : "Sản phẩm đang ở trạng thái CANDIDATE chờ AI phân tích chi tiết.";
    }

    if (newStatus !== previousStatus) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: newStatus },
      });
    }

    return {
      productId,
      previousStatus,
      newStatus,
      reason,
      evaluatedAt: new Date(),
    };
  }

  async updateProductStatus(productId: string, status: ProductStatus) {
    return await prisma.product.update({
      where: { id: productId },
      data: { status },
    });
  }
}

export const productService = new ProductService();
