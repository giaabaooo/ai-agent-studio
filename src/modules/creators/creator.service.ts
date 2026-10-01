import { prisma } from "@/lib/db";
import { ReferenceImageType } from "@prisma/client";

export class CreatorService {
  async getCreators() {
    return await prisma.virtualCreator.findMany({
      include: {
        voiceProfiles: true,
        referenceImages: {
          orderBy: { version: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async getCreatorByName(name: string) {
    return await prisma.virtualCreator.findUnique({
      where: { name: name.toUpperCase() },
      include: {
        voiceProfiles: true,
        referenceImages: true,
      },
    });
  }

  async addReferenceImage(
    creatorId: string,
    type: ReferenceImageType,
    localPath: string
  ) {
    const existingCount = await prisma.creatorReferenceImage.count({
      where: { creatorId, type },
    });

    const newVersion = existingCount + 1;

    return await prisma.creatorReferenceImage.create({
      data: {
        creatorId,
        type,
        localPath,
        approved: true,
        version: newVersion,
      },
    });
  }

  async updateVoiceProfile(
    creatorId: string,
    data: {
      provider?: string;
      providerVoiceId?: string;
      tone?: string;
      speakingRate?: number;
      energy?: number;
    }
  ) {
    const defaultProfile = await prisma.creatorVoiceProfile.findFirst({
      where: { creatorId, isDefault: true },
    });

    if (defaultProfile) {
      return await prisma.creatorVoiceProfile.update({
        where: { id: defaultProfile.id },
        data,
      });
    }

    return await prisma.creatorVoiceProfile.create({
      data: {
        creatorId,
        provider: data.provider || "MACOS_SAY",
        providerVoiceId: data.providerVoiceId || "Linh",
        tone: data.tone || "friendly, natural",
        speakingRate: data.speakingRate || 1.0,
        energy: data.energy || 1.0,
        isDefault: true,
      },
    });
  }
}

export const creatorService = new CreatorService();
