export interface TikTokTokenResponse {
  open_id: string;
  scope: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideoItem {
  id: string;
  title?: string;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

export interface TikTokVideoListResponse {
  videos: TikTokVideoItem[];
  cursor?: number;
  has_more: boolean;
}

export interface TikTokDraftUploadResult {
  publishId: string;
}

export interface PublishingProvider {
  getAuthorizationUrl(state: string, codeChallenge: string): string;
  exchangeCodeForToken(code: string, codeVerifier: string): Promise<TikTokTokenResponse>;
  refreshToken(refreshToken: string): Promise<TikTokTokenResponse>;
  getUserInfo(accessToken: string): Promise<TikTokUserInfo>;
  getVideoList(accessToken: string, cursor?: number, maxCount?: number): Promise<TikTokVideoListResponse>;
  initDraftUpload(
    accessToken: string,
    videoFilePath: string,
    title: string,
    isAigc?: boolean
  ): Promise<TikTokDraftUploadResult>;
}
