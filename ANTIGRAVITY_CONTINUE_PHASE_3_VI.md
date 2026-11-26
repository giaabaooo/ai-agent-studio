# LỆNH TIẾP TỤC TRIỂN KHAI — PHASE 3: TIKTOK CONNECT & PUBLISHING PREP

## Bối cảnh bắt buộc

Project root chính thức duy nhất là:

`/Users/na/Documents/GitHub/ai-agent-studio`

Không tạo repo Git mới, không dùng scratch workspace, không sửa/xóa dữ liệu PostgreSQL hiện có ngoài migration được tạo cho Phase 3.

## Trạng thái đã hoàn thành

- Phase 1 Core App đã hoàn thành: owner auth, Creator LINH/NAM, Product Analyst, Creative Engine, Claim Guard, Content Lab.
- Phase 2 Media Pipeline đã hoàn thành: upload asset theo storage key tương đối, voice macOS/import external, SRT subtitle, FFmpeg render final 1080×1920.
- `GEMINI_API_KEY` đã được cấu hình cục bộ trong `.env.local` và gọi Gemini thành công. Không đọc, in, sửa hoặc commit bất cứ secret nào từ `.env.local`.
- Database PostgreSQL local chạy tại `localhost:5433`; migration Phase 2 đã áp dụng.
- Quality gate hiện pass: Prisma validate, typecheck, 14 tests, lint, production build.

Đọc trước các file:

- `README.md`
- `REVIEW_PACKAGE_PHASE_1.md`
- `REVIEW_PACKAGE_PHASE_2.md`
- `docs/TIKTOK_CAPABILITIES.md`
- `prisma/schema.prisma`

## Mục tiêu Phase 3

Xây dựng tích hợp TikTok **human-in-the-loop** gồm OAuth, lưu token mã hóa, đồng bộ dữ liệu account/video và chuẩn bị upload draft. Không triển khai auto-post hoặc tự động gắn giỏ hàng.

### 1. TikTok OAuth / Login Kit

- Tạo provider/module TikTok chính thức, dùng Authorization Code + PKCE.
- Tạo endpoint bắt đầu authorize và callback.
- Dùng `state` chống CSRF và PKCE verifier lưu ngắn hạn, server-side.
- Chỉ khởi động flow OAuth nếu `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` hợp lệ; nếu thiếu, trả thông báo UI rõ ràng, không crash.
- Mã hóa access token/refresh token trước khi lưu vào `TikTokOAuthToken`, dùng helper AES-256-GCM hiện có.
- Không in token, code, verifier hoặc secret vào log/API response.

### 2. Đồng bộ Display API

- Provider lấy profile/account snapshot và danh sách video qua TikTok API chính thức.
- Cập nhật `TikTokAccount` và tạo `TikTokAccountSnapshot` có timestamp.
- Lưu video/publication metadata theo schema có sẵn; không scrape web, không private API/cookie.
- Nút `SYNC NOW` chỉ hoạt động khi OAuth đã kết nối; nếu chưa kết nối, dẫn người dùng tới Settings/TikTok connect.
- Tính metrics/rates bằng TypeScript/SQL deterministic, không dùng Gemini cho phép tính.

### 3. Draft upload preparation

- Chỉ tạo luồng upload draft nếu TikTok app/scopes cho phép, có feature flag `TIKTOK_DRAFT_UPLOAD_ENABLED=false` mặc định.
- Final MP4 phải ở trạng thái `FINAL_RENDERED` trước khi được phép chọn upload.
- Luôn đánh dấu AI-generated (`is_aigc: true`) nếu endpoint hỗ trợ field này.
- Không gọi Direct Post `video.publish`.
- Không có API tự động gắn sản phẩm/giỏ hàng affiliate. UI phải hiển thị manual checklist cho bước này.

### 4. UI

- Cập nhật Settings thành trang TikTok Connection: trạng thái cấu hình, kết nối, scope, hạn token và nút Connect/Reconnect.
- Cập nhật dashboard với trạng thái account/sync cuối cùng.
- Trong Creative Studio, final video có khu vực “TikTok Draft” bị khóa nếu chưa OAuth/quyền feature flag.
- Nội dung UI tiếng Việt, lỗi thân thiện, không hiển thị secret/token.

## Yêu cầu portability và an toàn

- Không hard-code path Mac/Windows. Tiếp tục dùng `MEDIA_ROOT`, `MACHINE_LABEL`, `FFMPEG_PATH`.
- Không commit `.env`, `.env.local`, key, token, media, DB dump hoặc cache.
- Chỉ lưu storage key tương đối trong DB.
- Không thêm browser automation cho ChatGPT/Gemini/TikTok.
- Chưa cần TikTok credential thật để code. Dùng dependency injection/mock tests để toàn bộ quality gate pass khi credential trống.

## Chất lượng bắt buộc

1. Viết tests cho PKCE/state validation, encrypt/decrypt token, trạng thái OAuth lỗi và mapper response TikTok.
2. Tạo migration nếu schema cần bổ sung, không sửa migration cũ.
3. Cập nhật `README.md`, `docs/TIKTOK_CAPABILITIES.md`, `docs/ENVIRONMENT_REPORT.md` theo implementation thực tế.
4. Tạo `REVIEW_PACKAGE_PHASE_3.md` nêu rõ phần đã làm, phần phụ thuộc TikTok app approval và kết quả test.
5. Chạy và tự sửa đến khi pass:

```bash
pnpm prisma validate
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

6. Sau khi tất cả pass, hiển thị `git status` và danh sách file thay đổi. Không tự commit/push nếu chưa có xác nhận riêng.

## Điều kiện dừng

Dừng sau Phase 3 + review package + quality gate pass để GPT review. Nếu cần TikTok Client Key/Secret/redirect HTTPS thật để test OAuth ngoài sandbox, ghi rõ checklist cấu hình và dừng; không bịa credentials hoặc bypass TikTok approval.
