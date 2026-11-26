export interface RawTikTokMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface CalculatedVideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  likeRate: number;
  commentRate: number;
  shareRate: number;
  engagementRate: number;
  viewVelocity: number;
}

/**
 * Calculates deterministic engagement rates and velocity without using LLM/AI.
 * All rates are normalized between 0.0 and 1.0 (ratio) and rounded to 6 decimal places.
 */
export function calculateVideoRates(
  raw: RawTikTokMetrics,
  postedAt?: Date | string | number
): CalculatedVideoMetrics {
  const views = Math.max(0, Math.floor(raw.views || 0));
  const likes = Math.max(0, Math.floor(raw.likes || 0));
  const comments = Math.max(0, Math.floor(raw.comments || 0));
  const shares = Math.max(0, Math.floor(raw.shares || 0));

  let likeRate = 0;
  let commentRate = 0;
  let shareRate = 0;
  let engagementRate = 0;

  if (views > 0) {
    likeRate = Number((likes / views).toFixed(6));
    commentRate = Number((comments / views).toFixed(6));
    shareRate = Number((shares / views).toFixed(6));
    engagementRate = Number(((likes + comments + shares) / views).toFixed(6));
  }

  // Calculate view velocity: views per hour since publication
  let viewVelocity = views;
  if (postedAt) {
    const postTime = new Date(postedAt).getTime();
    const now = Date.now();
    const diffHours = (now - postTime) / (1000 * 60 * 60);
    if (diffHours >= 0.1) {
      viewVelocity = Number((views / diffHours).toFixed(2));
    }
  }

  return {
    views,
    likes,
    comments,
    shares,
    likeRate,
    commentRate,
    shareRate,
    engagementRate,
    viewVelocity,
  };
}

export interface RawTikTokUserStats {
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface NormalizedAccountStats {
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
}

/**
 * Normalizes TikTok account stats from official Display API response.
 */
export function normalizeAccountStats(stats?: RawTikTokUserStats): NormalizedAccountStats {
  return {
    followerCount: Math.max(0, Math.floor(stats?.follower_count ?? 0)),
    followingCount: Math.max(0, Math.floor(stats?.following_count ?? 0)),
    likesCount: Math.max(0, Math.floor(stats?.likes_count ?? 0)),
    videoCount: Math.max(0, Math.floor(stats?.video_count ?? 0)),
  };
}
