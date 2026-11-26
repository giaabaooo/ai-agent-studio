import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/security/crypto";
import { generatePKCE } from "@/lib/security/pkce";
import {
  calculateVideoRates,
  normalizeAccountStats,
} from "@/lib/scoring/metrics";
import { tiktokProvider, TikTokProvider } from "@/providers/publishing/tiktok.provider";
import { PublishingProvider } from "@/providers/publishing/publishing-provider.interface";

export class TikTokService {
  private provider: PublishingProvider;

  constructor(provider?: PublishingProvider) {
    this.provider = provider ?? tiktokProvider;
  }

  /**
   * Generates authorization URL and creates a short-lived server-side session.
   */
  public async createOAuthSession(): Promise<{ authUrl: string; state: string }> {
    const isConfigured =
      this.provider instanceof TikTokProvider
        ? this.provider.isConfigured()
        : Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_REDIRECT_URI);

    if (!isConfigured) {
      throw new Error(
        "TikTok API chưa được cấu hình. Vui lòng thiết lập TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET và TIKTOK_REDIRECT_URI."
      );
    }

    const pkce = generatePKCE();

    // Clean up expired sessions first
    await prisma.tikTokOAuthSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Save session with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.tikTokOAuthSession.create({
      data: {
        state: pkce.state,
        codeVerifier: pkce.codeVerifier,
        expiresAt,
      },
    });

    const authUrl = this.provider.getAuthorizationUrl(
      pkce.state,
      pkce.codeChallenge
    );

    return { authUrl, state: pkce.state };
  }

  /**
   * Handles OAuth callback: validates state, exchanges code for tokens,
   * encrypts tokens, and upserts TikTokAccount and TikTokOAuthToken.
   */
  public async handleOAuthCallback(code: string, state: string) {
    if (!code || !state) {
      throw new Error("Thiếu mã code hoặc state trong phản hồi từ TikTok");
    }

    // Retrieve and consume session
    const session = await prisma.tikTokOAuthSession.findUnique({
      where: { state },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.tikTokOAuthSession.delete({ where: { id: session.id } });
      }
      throw new Error(
        "Phiên xác thực OAuth không hợp lệ hoặc đã hết hạn (CSRF state mismatch)"
      );
    }

    // Delete session immediately to prevent replay
    await prisma.tikTokOAuthSession.delete({ where: { id: session.id } });

    // Exchange code for token
    const tokenResponse = await this.provider.exchangeCodeForToken(
      code,
      session.codeVerifier
    );

    // Fetch user profile info
    const userInfo = await this.provider.getUserInfo(tokenResponse.access_token);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = encryptToken(tokenResponse.refresh_token);

    const now = Date.now();
    const expiresAt = new Date(now + tokenResponse.expires_in * 1000);
    const refreshExpiresAt = new Date(
      now + tokenResponse.refresh_expires_in * 1000
    );

    const username =
      userInfo.display_name?.toLowerCase().replace(/\\s+/g, "_") ||
      `tiktok_${tokenResponse.open_id.slice(0, 8)}`;

    // Upsert TikTok account
    const account = await prisma.tikTokAccount.upsert({
      where: { openId: tokenResponse.open_id },
      update: {
        displayName: userInfo.display_name || "TikTok Creator",
        avatarUrl: userInfo.avatar_url,
        unionId: userInfo.union_id,
        isActive: true,
      },
      create: {
        openId: tokenResponse.open_id,
        unionId: userInfo.union_id,
        username,
        displayName: userInfo.display_name || "TikTok Creator",
        avatarUrl: userInfo.avatar_url,
        isActive: true,
      },
    });

    // Upsert OAuth token
    await prisma.tikTokOAuthToken.upsert({
      where: { accountId: account.id },
      update: {
        encryptedAccessToken,
        encryptedRefreshToken,
        scope: tokenResponse.scope,
        expiresAt,
        refreshExpiresAt,
      },
      create: {
        accountId: account.id,
        encryptedAccessToken,
        encryptedRefreshToken,
        scope: tokenResponse.scope,
        expiresAt,
        refreshExpiresAt,
      },
    });

    // Store initial stats snapshot
    const stats = normalizeAccountStats(userInfo);
    await prisma.tikTokAccountSnapshot.create({
      data: {
        accountId: account.id,
        followerCount: stats.followerCount,
        followingCount: stats.followingCount,
        likesCount: stats.likesCount,
        videoCount: stats.videoCount,
      },
    });

    return {
      accountId: account.id,
      openId: account.openId,
      displayName: account.displayName,
      username: account.username,
      avatarUrl: account.avatarUrl,
    };
  }

  /**
   * Retrieves connection status and public account info without secrets.
   */
  public async getAccountStatus() {
    const isConfigured =
      this.provider instanceof TikTokProvider
        ? this.provider.isConfigured()
        : Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET && env.TIKTOK_REDIRECT_URI);

    if (!isConfigured) {
      return {
        configured: false,
        status: "NOT_CONFIGURED" as const,
        message: "Chưa cấu hình TIKTOK_CLIENT_KEY / SECRET / REDIRECT_URI",
        account: null,
        snapshot: null,
        draftUploadEnabled: env.TIKTOK_DRAFT_UPLOAD_ENABLED,
      };
    }

    const account = await prisma.tikTokAccount.findFirst({
      where: { isActive: true },
      include: {
        oauthTokens: true,
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!account || !account.oauthTokens) {
      return {
        configured: true,
        status: "NOT_CONNECTED" as const,
        message: "Chưa kết nối tài khoản TikTok",
        account: null,
        snapshot: null,
        draftUploadEnabled: env.TIKTOK_DRAFT_UPLOAD_ENABLED,
      };
    }

    const isExpired = account.oauthTokens.expiresAt < new Date();
    const status = isExpired ? ("EXPIRED" as const) : ("CONNECTED" as const);

    return {
      configured: true,
      status,
      message: isExpired
        ? "Access token đã hết hạn, cần Reconnect hoặc Refresh"
        : "Đã kết nối TikTok thành công",
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        stage: account.stage,
        openId: account.openId,
      },
      tokenExpiresAt: account.oauthTokens.expiresAt,
      scope: account.oauthTokens.scope,
      snapshot: account.snapshots[0] || null,
      draftUploadEnabled: env.TIKTOK_DRAFT_UPLOAD_ENABLED,
    };
  }

  /**
   * Synchronizes account stats and video publications using Display API.
   * Calculates metrics deterministically in TypeScript without LLMs.
   */
  public async syncData() {
    const account = await prisma.tikTokAccount.findFirst({
      where: { isActive: true },
      include: { oauthTokens: true },
    });

    if (!account || !account.oauthTokens) {
      throw new Error(
        "Chưa kết nối tài khoản TikTok. Vui lòng kết nối trước khi đồng bộ."
      );
    }

    let accessToken = decryptToken(account.oauthTokens.encryptedAccessToken);
    const now = Date.now();

    // Check if access token is expired or close to expiry (< 5 minutes)
    if (account.oauthTokens.expiresAt.getTime() - now < 5 * 60 * 1000) {
      const refreshToken = decryptToken(
        account.oauthTokens.encryptedRefreshToken
      );
      const refreshed = await this.provider.refreshToken(refreshToken);

      accessToken = refreshed.access_token;
      const encryptedAccessToken = encryptToken(refreshed.access_token);
      const encryptedRefreshToken = encryptToken(refreshed.refresh_token);
      const expiresAt = new Date(now + refreshed.expires_in * 1000);
      const refreshExpiresAt = new Date(
        now + refreshed.refresh_expires_in * 1000
      );

      await prisma.tikTokOAuthToken.update({
        where: { accountId: account.id },
        data: {
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          refreshExpiresAt,
          scope: refreshed.scope || account.oauthTokens.scope,
        },
      });
    }

    // 1. Fetch user profile & record snapshot
    const userInfo = await this.provider.getUserInfo(accessToken);
    const stats = normalizeAccountStats(userInfo);

    await prisma.tikTokAccount.update({
      where: { id: account.id },
      data: {
        displayName: userInfo.display_name || account.displayName,
        avatarUrl: userInfo.avatar_url || account.avatarUrl,
      },
    });

    const snapshot = await prisma.tikTokAccountSnapshot.create({
      data: {
        accountId: account.id,
        followerCount: stats.followerCount,
        followingCount: stats.followingCount,
        likesCount: stats.likesCount,
        videoCount: stats.videoCount,
      },
    });

    // 2. Fetch video list & record metric snapshots
    const videoListRes = await this.provider.getVideoList(accessToken, 0, 20);
    let matchedPublicationsCount = 0;

    for (const vid of videoListRes.videos) {
      let publication = await prisma.publication.findFirst({
        where: {
          accountId: account.id,
          tikTokVideoId: vid.id,
        },
      });

      if (!publication && vid.title) {
        // Try to match publication by creative hook or product name
        publication = await prisma.publication.findFirst({
          where: {
            accountId: account.id,
            creative: {
              OR: [
                { hook: { contains: vid.title } },
                { product: { name: { contains: vid.title } } },
              ],
            },
          },
        });

        if (publication) {
          await prisma.publication.update({
            where: { id: publication.id },
            data: {
              tikTokVideoId: vid.id,
              tikTokShareUrl: vid.share_url,
            },
          });
        }
      }

      if (publication) {
        matchedPublicationsCount++;
        const metrics = calculateVideoRates(
          {
            views: vid.view_count,
            likes: vid.like_count,
            comments: vid.comment_count,
            shares: vid.share_count,
          },
          publication.postedAt
        );

        await prisma.videoMetricSnapshot.create({
          data: {
            publicationId: publication.id,
            views: metrics.views,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            likeRate: metrics.likeRate,
            commentRate: metrics.commentRate,
            shareRate: metrics.shareRate,
            engagementRate: metrics.engagementRate,
            viewVelocity: metrics.viewVelocity,
          },
        });
      }
    }

    return {
      success: true,
      syncedAt: new Date(),
      account: account.displayName,
      snapshot,
      totalVideosFetched: videoListRes.videos.length,
      matchedPublicationsCount,
    };
  }

  /**
   * Disconnects TikTok account by removing stored tokens.
   */
  public async disconnect() {
    const account = await prisma.tikTokAccount.findFirst({
      where: { isActive: true },
    });

    if (account) {
      await prisma.tikTokOAuthToken.deleteMany({
        where: { accountId: account.id },
      });
      await prisma.tikTokAccount.update({
        where: { id: account.id },
        data: { isActive: false },
      });
    }

    return { success: true };
  }

  /**
   * Uploads final rendered video as draft into TikTok Inbox.
   * Gated by TIKTOK_DRAFT_UPLOAD_ENABLED=true.
   */
  public async uploadDraft(creativeId: string) {
    if (!env.TIKTOK_DRAFT_UPLOAD_ENABLED) {
      throw new Error(
        "Chức năng Upload Draft TikTok đang bị tắt bởi feature flag (TIKTOK_DRAFT_UPLOAD_ENABLED=false)"
      );
    }

    const creative = await prisma.creative.findUnique({
      where: { id: creativeId },
      include: {
        assets: true,
        product: true,
      },
    });

    if (!creative) {
      throw new Error(`Creative không tồn tại với id: ${creativeId}`);
    }

    const isFinalReady =
      creative.status === "FINAL_RENDERED" ||
      creative.status === "READY_TO_POST" ||
      creative.status === "PUBLISHED";

    const finalVideoAsset = creative.assets.find(
      (a) => a.type === "FINAL_VIDEO"
    );

    if (!finalVideoAsset || !isFinalReady) {
      throw new Error(
        "Creative chưa có video ở trạng thái hoàn chỉnh (FINAL_RENDERED). Vui lòng render trước khi upload nháp."
      );
    }

    const videoPath = path.isAbsolute(finalVideoAsset.localPath)
      ? finalVideoAsset.localPath
      : path.join(process.cwd(), env.MEDIA_ROOT, finalVideoAsset.localPath);

    if (!fs.existsSync(videoPath)) {
      throw new Error(
        `Tập tin video không tồn tại trên hệ thống lưu trữ: ${videoPath}`
      );
    }

    const account = await prisma.tikTokAccount.findFirst({
      where: { isActive: true },
      include: { oauthTokens: true },
    });

    if (!account || !account.oauthTokens) {
      throw new Error("Chưa kết nối tài khoản TikTok để upload draft");
    }

    const accessToken = decryptToken(account.oauthTokens.encryptedAccessToken);
    const videoTitle = `${creative.hook || creative.product.name} #affiliate #review`;

    const result = await this.provider.initDraftUpload(
      accessToken,
      videoPath,
      videoTitle,
      true // is_aigc: true
    );

    // Record or update publication
    const publication = await prisma.publication.upsert({
      where: { creativeId: creative.id },
      update: {
        accountId: account.id,
        publishId: result.publishId,
      },
      create: {
        accountId: account.id,
        creativeId: creative.id,
        publishId: result.publishId,
      },
    });

    return {
      success: true,
      publishId: result.publishId,
      publicationId: publication.id,
      message: "Video đã được upload vào TikTok Inbox dưới dạng Nháp (Draft). Vui lòng mở TikTok app để duyệt và gắn giỏ hàng affiliate.",
    };
  }
}

export const tiktokService = new TikTokService();
