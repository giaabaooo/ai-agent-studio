import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { animationService } from "@/modules/animation/animation.service";
import { AnimationAssetType, SeriesStatus } from "@prisma/client";

describe("AnimationService & Render Preflight", () => {
  let testSeriesId = "";
  let testEpisodeId = "";
  let testSceneId = "";

  beforeEach(async () => {
    // Clean up previous test series if any
    const existing = await prisma.animationSeries.findUnique({
      where: { slug: "test-series-unit" },
    });
    if (existing) {
      await prisma.animationSeries.delete({ where: { id: existing.id } });
    }

    // Create test series, season, episode, scene
    const series = await prisma.animationSeries.create({
      data: {
        title: "Test Series",
        slug: "test-series-unit",
        status: SeriesStatus.ACTIVE,
        seasons: {
          create: {
            number: 1,
            title: "Mùa 1",
            episodes: {
              create: {
                number: 1,
                title: "Tập 1 Test",
                scenes: {
                  create: {
                    orderIndex: 1,
                    startSec: 0,
                    endSec: 5,
                    durationSec: 5,
                    action: "Mít đi dạo trong vườn",
                    visualPrompt: "Original stylized 3D animation, vertical 9:16",
                    negativePrompt: "photorealistic",
                  },
                },
              },
            },
          },
        },
      },
      include: {
        seasons: {
          include: {
            episodes: {
              include: { scenes: true },
            },
          },
        },
      },
    });

    testSeriesId = series.id;
    testEpisodeId = series.seasons[0].episodes[0].id;
    testSceneId = series.seasons[0].episodes[0].scenes[0].id;
  });

  afterAll(async () => {
    if (testSeriesId) {
      await prisma.animationSeries.deleteMany({
        where: { id: testSeriesId },
      });
    }
  });

  it("should fail preflight when scene has no video asset", async () => {
    const preflight = await animationService.validateEpisodeRender(testEpisodeId);
    expect(preflight.canRender).toBe(false);
    expect(preflight.missingVideoSceneIndices).toContain(1);
    expect(preflight.issues.some((i) => i.includes("chưa có video raw"))).toBe(true);
  });

  it("should fail preflight when video is uploaded but not approved", async () => {
    await prisma.sceneAsset.create({
      data: {
        sceneId: testSceneId,
        assetType: AnimationAssetType.RAW_VIDEO,
        localPath: "animation/raw_videos/test_clip.mp4",
        mimeType: "video/mp4",
        fileSize: 1024,
        approved: false, // Not approved!
        version: 1,
      },
    });

    const preflight = await animationService.validateEpisodeRender(testEpisodeId);
    expect(preflight.canRender).toBe(false);
    expect(preflight.missingApprovedVideoScenes).toContain(1);
    expect(preflight.issues.some((i) => i.includes("chưa được duyệt video"))).toBe(true);
  });

  it("should pass preflight when scene has an approved video", async () => {
    await prisma.sceneAsset.create({
      data: {
        sceneId: testSceneId,
        assetType: AnimationAssetType.RAW_VIDEO,
        localPath: "animation/raw_videos/test_clip_approved.mp4",
        mimeType: "video/mp4",
        fileSize: 1024,
        approved: true, // Approved!
        version: 1,
      },
    });

    const preflight = await animationService.validateEpisodeRender(testEpisodeId);
    expect(preflight.canRender).toBe(true);
    expect(preflight.missingVideoSceneIndices.length).toBe(0);
    expect(preflight.missingApprovedVideoScenes.length).toBe(0);
  });
});
