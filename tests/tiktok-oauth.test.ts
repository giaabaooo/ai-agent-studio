import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TikTokProvider } from "@/providers/publishing/tiktok.provider";
import { encryptToken, decryptToken } from "@/lib/security/crypto";

describe("TikTok Provider & OAuth Flow (Unit & Mocked)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should generate valid authorization URL with PKCE parameters", () => {
    const provider = new TikTokProvider(
      "test_client_key_123",
      "test_client_secret_456",
      "http://localhost:3000/api/tiktok/callback"
    );

    const state = "csrf_state_random_token";
    const codeChallenge = "mocked_code_challenge_s256";
    const url = provider.getAuthorizationUrl(state, codeChallenge);

    expect(url).toContain("https://www.tiktok.com/v2/auth/authorize/");
    expect(url).toContain("client_key=test_client_key_123");
    expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Ftiktok%2Fcallback");
    expect(url).toContain("state=csrf_state_random_token");
    expect(url).toContain("code_challenge=mocked_code_challenge_s256");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("user.info.basic");
    expect(url).toContain("video.list");
  });

  it("should fail gracefully when client_key is missing", () => {
    const unconfiguredProvider = new TikTokProvider("", "", "");
    expect(() =>
      unconfiguredProvider.getAuthorizationUrl("state", "challenge")
    ).toThrow("TikTok API chưa được cấu hình");
  });

  it("should exchange code for tokens with mocked TikTok endpoint", async () => {
    const provider = new TikTokProvider(
      "test_key",
      "test_secret",
      "http://localhost:3000/api/tiktok/callback"
    );

    const mockResponse = {
      open_id: "tiktok_open_id_user_999",
      access_token: "act.mock_access_token_value_abc123",
      expires_in: 86400,
      refresh_token: "rft.mock_refresh_token_value_xyz789",
      refresh_expires_in: 31536000,
      scope: "user.info.basic,user.info.profile,user.info.stats,video.list",
      token_type: "Bearer",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const tokens = await provider.exchangeCodeForToken("valid_auth_code", "valid_code_verifier");

    expect(tokens.open_id).toBe("tiktok_open_id_user_999");
    expect(tokens.access_token).toBe("act.mock_access_token_value_abc123");
    expect(tokens.expires_in).toBe(86400);
    expect(tokens.refresh_token).toBe("rft.mock_refresh_token_value_xyz789");
  });

  it("should handle TikTok OAuth error responses gracefully without leaking secrets", async () => {
    const provider = new TikTokProvider(
      "test_key",
      "test_secret",
      "http://localhost:3000/api/tiktok/callback"
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "invalid_grant",
        error_description: "The authorization code has expired or is invalid",
      }),
    });

    await expect(
      provider.exchangeCodeForToken("expired_code", "verifier")
    ).rejects.toThrow("The authorization code has expired or is invalid");
  });

  it("should fetch user profile & stats via Display API mock", async () => {
    const provider = new TikTokProvider("key", "secret", "http://localhost:3000/callback");

    const mockUserPayload = {
      data: {
        user: {
          open_id: "usr_123",
          union_id: "union_456",
          avatar_url: "https://p16.tiktokcdn.com/avatar.jpg",
          display_name: "Creative Creator",
          follower_count: 520,
          following_count: 30,
          likes_count: 8900,
          video_count: 12,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserPayload,
    });

    const userInfo = await provider.getUserInfo("mock_access_token");

    expect(userInfo.open_id).toBe("usr_123");
    expect(userInfo.display_name).toBe("Creative Creator");
    expect(userInfo.follower_count).toBe(520);
    expect(userInfo.likes_count).toBe(8900);
    expect(userInfo.video_count).toBe(12);
  });

  it("should fetch public video list via Display API mock", async () => {
    const provider = new TikTokProvider("key", "secret", "http://localhost:3000/callback");

    const mockVideoPayload = {
      data: {
        videos: [
          {
            id: "vid_7123456789",
            title: "Review Nồi Chiên Không Dầu #review #affiliate",
            share_url: "https://www.tiktok.com/@creator/video/7123456789",
            view_count: 15400,
            like_count: 920,
            comment_count: 45,
            share_count: 32,
            duration: 12,
          },
        ],
        cursor: 1,
        has_more: false,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVideoPayload,
    });

    const result = await provider.getVideoList("mock_access_token", 0, 10);

    expect(result.videos.length).toBe(1);
    expect(result.videos[0].id).toBe("vid_7123456789");
    expect(result.videos[0].view_count).toBe(15400);
    expect(result.videos[0].like_count).toBe(920);
  });

  it("should encrypt tokens with AES-256-GCM and decrypt accurately for storage", () => {
    const originalToken = "act.tiktok_access_token_super_secret_sample";
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(":"); // iv:authTag:cipher
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });
});
