import { describe, it, expect } from "vitest";
import {
  calculateVideoRates,
  normalizeAccountStats,
} from "@/lib/scoring/metrics";

describe("TikTok Metrics & Rates Calculation (Deterministic)", () => {
  it("should calculate engagement rates accurately without floating point NaN", () => {
    const raw = {
      views: 10000,
      likes: 650,
      comments: 120,
      shares: 80,
    };

    const result = calculateVideoRates(raw);

    expect(result.views).toBe(10000);
    expect(result.likes).toBe(650);
    expect(result.comments).toBe(120);
    expect(result.shares).toBe(80);

    expect(result.likeRate).toBe(0.065); // 650 / 10000
    expect(result.commentRate).toBe(0.012); // 120 / 10000
    expect(result.shareRate).toBe(0.008); // 80 / 10000
    expect(result.engagementRate).toBe(0.085); // (650 + 120 + 80) / 10000
  });

  it("should handle zero views gracefully without dividing by zero", () => {
    const zeroStats = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    const result = calculateVideoRates(zeroStats);

    expect(result.likeRate).toBe(0);
    expect(result.commentRate).toBe(0);
    expect(result.shareRate).toBe(0);
    expect(result.engagementRate).toBe(0);
    expect(result.viewVelocity).toBe(0);
    expect(Number.isNaN(result.likeRate)).toBe(false);
  });

  it("should calculate view velocity based on publication timestamp", () => {
    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

    const result = calculateVideoRates(
      {
        views: 2400,
        likes: 100,
      },
      twoHoursAgo
    );

    expect(result.views).toBe(2400);
    // 2400 views in 2 hours = 1200 views/hour
    expect(result.viewVelocity).toBeCloseTo(1200, 0);
  });

  it("should normalize raw TikTok account stats safely", () => {
    const rawUserStats = {
      follower_count: 1250,
      following_count: 48,
      likes_count: 35000,
      video_count: 15,
    };

    const normalized = normalizeAccountStats(rawUserStats);

    expect(normalized.followerCount).toBe(1250);
    expect(normalized.followingCount).toBe(48);
    expect(normalized.likesCount).toBe(35000);
    expect(normalized.videoCount).toBe(15);
  });

  it("should fallback to 0 for undefined or missing account stats fields", () => {
    const emptyStats = normalizeAccountStats(undefined);

    expect(emptyStats.followerCount).toBe(0);
    expect(emptyStats.followingCount).toBe(0);
    expect(emptyStats.likesCount).toBe(0);
    expect(emptyStats.videoCount).toBe(0);
  });
});
