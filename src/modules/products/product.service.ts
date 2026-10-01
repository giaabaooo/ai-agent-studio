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

    return {
      analysis: savedAnalysis,
      scores: scoreFactors,
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
