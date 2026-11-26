import fs from "fs";
import { env } from "@/lib/env";
import {
  PublishingProvider,
  TikTokDraftUploadResult,
  TikTokTokenResponse,
  TikTokUserInfo,
  TikTokVideoItem,
  TikTokVideoListResponse,
} from "./publishing-provider.interface";

export class TikTokProvider implements PublishingProvider {
  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientKey?: string, clientSecret?: string, redirectUri?: string) {
    this.clientKey = clientKey ?? env.TIKTOK_CLIENT_KEY;
    this.clientSecret = clientSecret ?? env.TIKTOK_CLIENT_SECRET;
    this.redirectUri = redirectUri ?? env.TIKTOK_REDIRECT_URI;
  }

  public isConfigured(): boolean {
    return Boolean(this.clientKey && this.clientSecret && this.redirectUri);
  }

  public getAuthorizationUrl(state: string, codeChallenge: string): string {
    if (!this.clientKey || !this.redirectUri) {
      throw new Error(
        "TikTok API chưa được cấu hình (thiếu TIKTOK_CLIENT_KEY hoặc TIKTOK_REDIRECT_URI)"
      );
    }

    const baseScopes = [
      "user.info.basic",
      "user.info.profile",
      "user.info.stats",
      "video.list",
    ];

    if (env.TIKTOK_DRAFT_UPLOAD_ENABLED) {
      baseScopes.push("video.upload");
    }

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: baseScopes.join(","),
      response_type: "code",
      redirect_uri: this.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  public async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<TikTokTokenResponse> {
    if (!this.isConfigured()) {
      throw new Error("TikTok API chưa được cấu hình đầy đủ client credentials");
    }

    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: body.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      const errMsg =
        data.error_description ||
        data.message ||
        data.error ||
        `TikTok token exchange failed with status ${res.status}`;
      throw new Error(`TikTok OAuth Error: ${errMsg}`);
    }

    return {
      open_id: data.open_id || data.data?.open_id,
      scope: data.scope || data.data?.scope || "",
      access_token: data.access_token || data.data?.access_token,
      expires_in: data.expires_in || data.data?.expires_in || 86400,
      refresh_token: data.refresh_token || data.data?.refresh_token,
      refresh_expires_in:
        data.refresh_expires_in || data.data?.refresh_expires_in || 31536000,
      token_type: data.token_type || data.data?.token_type || "Bearer",
    };
  }

  public async refreshToken(refreshToken: string): Promise<TikTokTokenResponse> {
    if (!this.isConfigured()) {
      throw new Error("TikTok API chưa được cấu hình đầy đủ client credentials");
    }

    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: body.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      const errMsg =
        data.error_description ||
        data.message ||
        data.error ||
        `TikTok token refresh failed with status ${res.status}`;
      throw new Error(`TikTok Token Refresh Error: ${errMsg}`);
    }

    return {
      open_id: data.open_id || data.data?.open_id,
      scope: data.scope || data.data?.scope || "",
      access_token: data.access_token || data.data?.access_token,
      expires_in: data.expires_in || data.data?.expires_in || 86400,
      refresh_token: data.refresh_token || data.data?.refresh_token,
      refresh_expires_in:
        data.refresh_expires_in || data.data?.refresh_expires_in || 31536000,
      token_type: data.token_type || data.data?.token_type || "Bearer",
    };
  }

  public async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const fields = [
      "open_id",
      "union_id",
      "avatar_url",
      "display_name",
      "follower_count",
      "following_count",
      "likes_count",
      "video_count",
    ].join(",");

    const res = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error?.code) {
      const errMsg =
        data.error?.message ||
        data.message ||
        `Fetch TikTok user info failed with status ${res.status}`;
      throw new Error(`TikTok User Info Error: ${errMsg}`);
    }

    const user = data.data?.user || {};
    return {
      open_id: user.open_id,
      union_id: user.union_id,
      avatar_url: user.avatar_url,
      display_name: user.display_name,
      follower_count: user.follower_count,
      following_count: user.following_count,
      likes_count: user.likes_count,
      video_count: user.video_count,
    };
  }

  public async getVideoList(
    accessToken: string,
    cursor = 0,
    maxCount = 20
  ): Promise<TikTokVideoListResponse> {
    const fields = [
      "id",
      "title",
      "cover_image_url",
      "share_url",
      "video_description",
      "duration",
      "height",
      "width",
      "create_time",
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
    ].join(",");

    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_count: Math.min(20, Math.max(1, maxCount)),
          cursor,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error?.code) {
      const errMsg =
        data.error?.message ||
        data.message ||
        `Fetch TikTok video list failed with status ${res.status}`;
      throw new Error(`TikTok Video List Error: ${errMsg}`);
    }

    const rawVideos = data.data?.videos || [];
    const videos: TikTokVideoItem[] = rawVideos.map((v: Record<string, unknown>) => ({
      id: String(v.id),
      title: typeof v.title === "string" ? v.title : undefined,
      cover_image_url:
        typeof v.cover_image_url === "string" ? v.cover_image_url : undefined,
      share_url: typeof v.share_url === "string" ? v.share_url : undefined,
      video_description:
        typeof v.video_description === "string" ? v.video_description : undefined,
      duration: typeof v.duration === "number" ? v.duration : undefined,
      height: typeof v.height === "number" ? v.height : undefined,
      width: typeof v.width === "number" ? v.width : undefined,
      create_time: typeof v.create_time === "number" ? v.create_time : undefined,
      view_count: typeof v.view_count === "number" ? v.view_count : 0,
      like_count: typeof v.like_count === "number" ? v.like_count : 0,
      comment_count: typeof v.comment_count === "number" ? v.comment_count : 0,
      share_count: typeof v.share_count === "number" ? v.share_count : 0,
    }));

    return {
      videos,
      cursor: data.data?.cursor,
      has_more: Boolean(data.data?.has_more),
    };
  }

  public async initDraftUpload(
    accessToken: string,
    videoFilePath: string,
    title: string,
    isAigc = true
  ): Promise<TikTokDraftUploadResult> {
    if (!env.TIKTOK_DRAFT_UPLOAD_ENABLED) {
      throw new Error(
        "Chức năng Upload Draft TikTok đang bị tắt bởi feature flag (TIKTOK_DRAFT_UPLOAD_ENABLED=false)"
      );
    }

    if (!fs.existsSync(videoFilePath)) {
      throw new Error(`File video không tồn tại tại đường dẫn: ${videoFilePath}`);
    }

    const stat = fs.statSync(videoFilePath);
    const videoSize = stat.size;

    // Step A: Init inbox draft
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          source_info: {
            source: "FILE_UPLOAD",
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1,
          },
          post_info: {
            title: title.slice(0, 150),
            privacy_level: "SELF_ONLY",
            is_aigc: isAigc,
          },
        }),
      }
    );

    const initData = await initRes.json().catch(() => ({}));

    if (!initRes.ok || initData.error?.code) {
      const errMsg =
        initData.error?.message ||
        initData.message ||
        `Init TikTok draft upload failed with status ${initRes.status}`;
      throw new Error(`TikTok Draft Upload Error: ${errMsg}`);
    }

    const publishId = initData.data?.publish_id;
    const uploadUrl = initData.data?.upload_url;

    if (!publishId || !uploadUrl) {
      throw new Error("TikTok API không trả về publish_id hoặc upload_url hợp lệ");
    }

    // Step B: Upload video binary to upload_url
    const fileStream = fs.createReadStream(videoFilePath);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoSize),
        "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      // Node fetch supports readable stream as body
      // @ts-expect-error - NodeJS ReadableStream is compatible with fetch body in Node 18+
      body: fileStream,
      duplex: "half",
    });

    if (!uploadRes.ok) {
      throw new Error(
        `Upload binary to TikTok chunk URL thất bại với HTTP status ${uploadRes.status}`
      );
    }

    return { publishId };
  }
}

export const tiktokProvider = new TikTokProvider();
