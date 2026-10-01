import { PrismaClient, Gender, ReferenceImageType } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Default Owner User
  const defaultEmail = "owner@studio.local";
  const defaultPassword = "studio-local-password-2026";
  const passwordHash = hashPassword(defaultPassword);

  const owner = await prisma.user.upsert({
    where: { email: defaultEmail },
    update: {},
    create: {
      email: defaultEmail,
      name: "Studio Owner",
      passwordHash,
    },
  });
  console.log(`✓ Owner created: ${owner.email} (Password: ${defaultPassword})`);

  // 2. Seed Virtual Creator: LINH
  const linh = await prisma.virtualCreator.upsert({
    where: { name: "LINH" },
    update: {},
    create: {
      name: "LINH",
      gender: Gender.FEMALE,
      ageStyle: "23-26",
      description:
        "Nữ Việt Nam, visual age 23-26. Phong cách thân thiện, tự nhiên, hiện đại, gần gũi, casual. Nhóm sản phẩm ưu tiên: home/lifestyle, organization, kitchen utilities, beauty tools, fashion accessories.",
      masterAppearancePrompt:
        "Vietnamese young woman, 24 years old, natural friendly look, casual modern style, high quality photography, soft natural indoor lighting, realistic facial features, genuine gentle smile, authentic TikTok UGC creator look, 9:16 portrait.",
      negativePrompt:
        "distorted face, extra fingers, deformed hands, plastic skin, anime, 3d render, oversaturated, artificial marketing render, watermark, extra limbs.",
      voiceProfiles: {
        create: {
          provider: "MACOS_SAY",
          providerVoiceId: "Linh",
          tone: "friendly, natural, modern, casual",
          speakingRate: 1.0,
          energy: 1.0,
          notes: "Giọng nữ miền Bắc/Nam tự nhiên, gần gũi, không mang âm hưởng quảng cáo truyền thống.",
          isDefault: true,
        },
      },
      referenceImages: {
        create: [
          {
            type: ReferenceImageType.MASTER_FACE,
            localPath: "media/creators/linh/master_face.jpg",
            approved: true,
            version: 1,
          },
          {
            type: ReferenceImageType.FRONT,
            localPath: "media/creators/linh/front_casual.jpg",
            approved: true,
            version: 1,
          },
        ],
      },
    },
  });
  console.log(`✓ Creator seeded: ${linh.name}`);

  // 3. Seed Virtual Creator: NAM
  const nam = await prisma.virtualCreator.upsert({
    where: { name: "NAM" },
    update: {},
    create: {
      name: "NAM",
      gender: Gender.MALE,
      ageStyle: "25-29",
      description:
        "Nam Việt Nam, visual age 25-29. Phong cách clean casual, thực dụng, tự nhiên, thân thiện. Nhóm sản phẩm ưu tiên: gadget, automotive, desk setup, electronics accessories, household gadget.",
      masterAppearancePrompt:
        "Vietnamese young man, 27 years old, clean casual look, practical friendly demeanor, modern neat haircut, authentic TikTok UGC creator look, natural lighting, realistic detailed hands, high resolution, 9:16 portrait.",
      negativePrompt:
        "distorted face, deformed hands, extra fingers, cartoon, smooth plastic skin, 3d render, watermark, morphing, oversaturated colors.",
      voiceProfiles: {
        create: {
          provider: "MACOS_SAY",
          providerVoiceId: "Nam",
          tone: "clean casual, practical, confident, direct",
          speakingRate: 1.0,
          energy: 1.0,
          notes: "Giọng nam trầm ấm, thực tế, dứt khoát, phong cách reviewer kỹ thuật/đồ chơi công nghệ.",
          isDefault: true,
        },
      },
      referenceImages: {
        create: [
          {
            type: ReferenceImageType.MASTER_FACE,
            localPath: "media/creators/nam/master_face.jpg",
            approved: true,
            version: 1,
          },
          {
            type: ReferenceImageType.FRONT,
            localPath: "media/creators/nam/front_casual.jpg",
            approved: true,
            version: 1,
          },
        ],
      },
    },
  });
  console.log(`✓ Creator seeded: ${nam.name}`);

  // 4. Seed Default TikTok Account in NEW stage
  const account = await prisma.tikTokAccount.upsert({
    where: { username: "affiliate_ai_studio" },
    update: {},
    create: {
      username: "affiliate_ai_studio",
      displayName: "Đồ Hay Tiện Ích",
      openId: "demo-local-account-openid",
      stage: "NEW",
      isActive: true,
      snapshots: {
        create: {
          followerCount: 0,
          followingCount: 5,
          likesCount: 0,
          videoCount: 0,
        },
      },
      stageHistories: {
        create: {
          fromStage: "NEW",
          toStage: "NEW",
          reason: "Khởi tạo tài khoản giai đoạn NEW (0-300 followers)",
          approvedBy: "OWNER",
        },
      },
    },
  });
  console.log(`✓ TikTok Account seeded: @${account.username} [Stage: ${account.stage}]`);

  console.log("🎉 Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
