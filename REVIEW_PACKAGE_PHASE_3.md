# BÁO CÁO NGHIỆM THU — PHASE 3: TIKTOK CONNECT & PUBLISHING PREP

**Dự án:** Affiliate AI Studio (Local-First on macOS)  
**Thời gian thực hiện:** 2026-10-02  
**Môi trường thực thi duy nhất:** `/Users/na/Documents/GitHub/ai-agent-studio`  
**Phiên bản:** v1.2 — Phase 3 Complete  
**Người đánh giá mục tiêu:** GPT-5.6 Sol / Architect Reviewer  

---

## 1. Tóm tắt mục tiêu Phase 3

Phase 3 tập trung xây dựng toàn bộ hạ tầng kết nối tài khoản TikTok chính thức (Login Kit & Display API) theo mô hình **Human-in-the-loop**, bảo mật token bằng mã hóa đối xứng, đồng bộ dữ liệu chỉ số kênh hoàn toàn bằng code toán học xác định, và chuẩn bị luồng upload nháp (Inbox Draft) an toàn.

### Các nguyên tắc tuân thủ tuyệt đối:
- **Không tự động Direct Post:** Tuyệt đối không dùng API `video.publish` để tự động đăng công khai.
- **Không tự động gắn giỏ hàng affiliate:** Do TikTok không cung cấp API gắn sản phẩm cho cá nhân, quy trình gắn giỏ hàng là **thao tác thủ công bắt buộc (Manual Step)** được hỗ trợ bởi checklist chi tiết trên UI.
- **Bảo mật Token:** Access token và refresh token được mã hóa bằng thuật toán `AES-256-GCM` với `TOKEN_ENCRYPTION_KEY` trước khi lưu vào PostgreSQL; không bao giờ lộ token ra client hoặc log.
- **Tính toán chỉ số xác định (Deterministic):** Tỷ lệ tương tác, like, comment, share và view velocity được tính toán 100% bằng TypeScript/toán học, không dùng LLM/AI.
- **Feature Flag an toàn:** Chức năng upload nháp được bảo vệ bởi cờ `TIKTOK_DRAFT_UPLOAD_ENABLED=false` mặc định.
- **Không giả lập/cào web:** Không sử dụng scraper, private API hay browser automation cho TikTok, ChatGPT hay Veo.

---

## 2. Chi tiết các thành phần đã triển khai

### A. Module Bảo Mật & PKCE (RFC 7636)
- **Tập tin:** `src/lib/security/pkce.ts`
  - Sinh `code_verifier` ngẫu nhiên 64 ký tự chuẩn base64url theo RFC 7636.
  - Tạo `code_challenge` theo thuật toán `S256` (`BASE64URL(SHA256(ASCII(verifier)))`).
  - Tạo `state` ngẫu nhiên chống tấn công CSRF.
  - Xác thực khớp nối giữa verifier và challenge (`verifyCodeChallenge`).
- **Lưu trữ phiên xác thực:** Bảng `TikTokOAuthSession` trong PostgreSQL lưu `state`, `codeVerifier` với hạn sống 10 phút, tự động dọn dẹp các phiên hết hạn khi khởi tạo phiên mới và xóa ngay sau khi sử dụng để chống tấn công replay.

### B. Mã hóa Token AES-256-GCM
- **Tập tin:** `src/lib/security/crypto.ts`
  - Mã hóa 2 chiều chuẩn công nghiệp `AES-256-GCM` với IV 96-bit ngẫu nhiên và Authentication Tag 128-bit (`iv:authTag:cipherHex`).
  - Tự động kiểm tra thời hạn access token trong quá trình đồng bộ và tự động gọi API Refresh Token khi token còn dưới 5 phút.

### C. Provider & Service TikTok Chính Thức
- **Interface:** `src/providers/publishing/publishing-provider.interface.ts`
- **Provider:** `src/providers/publishing/tiktok.provider.ts`
  - `getAuthorizationUrl(state, codeChallenge)`: Khởi tạo URL xác thực TikTok với các scopes `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list` (và `video.upload` nếu bật draft).
  - `exchangeCodeForToken(code, codeVerifier)`: Đổi authorization code lấy access token và refresh token qua `POST https://open.tiktokapis.com/v2/oauth/token/`.
  - `refreshToken(refreshToken)`: Làm mới token khi hết hạn.
  - `getUserInfo(accessToken)`: Lấy thông tin creator và stats từ `GET https://open.tiktokapis.com/v2/user/info/`.
  - `getVideoList(accessToken, cursor, maxCount)`: Lấy danh sách video công khai từ `POST https://open.tiktokapis.com/v2/video/list/`.
  - `initDraftUpload(accessToken, videoFilePath, title, isAigc)`: Đẩy video nháp vào TikTok Inbox qua `POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/` với cờ `is_aigc: true`.
- **Service:** `src/modules/tiktok/tiktok.service.ts`
  - Đóng gói toàn bộ luồng nghiệp vụ: Khởi tạo session, xử lý callback, upsert tài khoản, lưu snapshot, đồng bộ dữ liệu video định kỳ, ngắt kết nối và upload nháp.

### D. Tính toán Chỉ số Xác định (Deterministic Metrics)
- **Tập tin:** `src/lib/scoring/metrics.ts`
  - `likeRate = likes / views`
  - `commentRate = comments / views`
  - `shareRate = shares / views`
  - `engagementRate = (likes + comments + shares) / views`
  - `viewVelocity = views / hoursSincePost`
  - Xử lý an toàn trường hợp `views = 0` (trả về 0, không sinh `NaN` hay `Infinity`).
  - Chuẩn hóa số liệu profile an toàn (`normalizeAccountStats`).

### E. Hệ thống API Routes
1. `GET /api/tiktok/auth`: Bắt đầu luồng OAuth, tạo phiên PKCE và chuyển hướng tới TikTok.
2. `GET /api/tiktok/callback`: Nhận mã xác thực, xác thực CSRF state, đổi token, mã hóa lưu DB và chuyển hướng về `/settings?success=tiktok_connected`.
3. `GET /api/tiktok/status`: Cung cấp trạng thái kết nối, profile, snapshot và scopes an toàn (không trả secret/token).
4. `POST /api/tiktok/sync`: Kích hoạt đồng bộ profile & video Display API, cập nhật `TikTokAccountSnapshot` và `VideoMetricSnapshot`.
5. `POST /api/tiktok/disconnect`: Xóa token và ngắt kết nối tài khoản an toàn.
6. `POST /api/tiktok/draft/upload`: Upload video final vào hộp thư TikTok Inbox khi bật feature flag.

### F. Nâng cấp Giao diện Người Dùng (UI) & Responsive Sidebar
0. **Sidebar Responsive Mobile Drawer (`src/components/layout/sidebar.tsx`, `sidebar-context.tsx`, `top-nav.tsx`):**
   - Trên desktop (`>= lg`): Sidebar giữ nguyên cố định `w-64` trực quan, thẩm mỹ.
   - Trên màn hình hẹp/mobile (`< lg`): Sidebar tự động ẩn khỏi luồng trang, giải phóng 100% chiều ngang cho Calendar và toàn bộ trang nội dung.
   - Drawer trượt (Slide-over drawer) kèm lớp phủ mờ (backdrop overlay) mở ra khi bấm nút Hamburger Menu trên `TopNav`, tự động đóng lại khi bấm phím đóng, bấm ra ngoài hoặc click chuyển route.
   - Trang Calendar (`src/app/calendar/page.tsx`) được thiết kế responsive: hiển thị dạng lưới 7 cột trên màn hình lớn và tự động co giãn / xếp tầng tối ưu trên mobile/tablet.
1. **Trang Cài Đặt (`src/app/settings/page.tsx`):**
   - Bảng điều khiển kết nối TikTok toàn diện: trạng thái kết nối (`CONNECTED`, `NOT_CONNECTED`, `EXPIRED`, `NOT_CONFIGURED`), thông tin creator, 4 chỉ số snapshot (Followers, Likes, Videos, Last Sync), thời hạn token, scopes đã cấp, trạng thái mã hóa AES-256-GCM.
   - Các nút bấm tương tác: "Kết Nối TikTok", "Đồng Bộ Ngay", "Reconnect", "Ngắt Kết Nối".
   - Tự động hiển thị hướng dẫn cấu hình khi thiếu credentials trong môi trường.
2. **Thanh Điều Hướng Trên Cùng (`src/components/layout/top-nav.tsx`):**
   - Nút `SYNC NOW` hoạt động thực tế: gọi `/api/tiktok/sync`. Nếu chưa kết nối tài khoản, tự động thông báo và dẫn người dùng tới trang Cài Đặt.
   - Hiển thị username TikTok thực tế thay vì hardcode.
3. **Bảng Điều Khiển Tổng Quan (`src/app/dashboard/page.tsx`):**
   - Hiển thị badge trạng thái kết nối TikTok và thời gian đồng bộ Display API gần nhất.
   - Đồng bộ số lượng follower và video từ snapshot thực tế của kênh.
4. **Phòng Lab Kịch Bản (`src/app/content/[id]/page.tsx`):**
   - Thêm thẻ **Bước 4: Xuất Bản TikTok & Gắn Giỏ Hàng Affiliate (Human-in-the-Loop)**.
   - Checklist 5 bước thủ công:
     1. Kiểm duyệt video render 1080×1920 hoàn chỉnh.
     2. Xác nhận Claim Guard `PASS`.
     3. Nút 1-click Copy toàn bộ Caption & Hashtags.
     4. Ghi nhớ tên sản phẩm, danh mục, SKU để tự chọn giỏ hàng trên app TikTok.
     5. Bắt buộc bật nhãn "Nội dung do AI tạo" (AIGC Label: ON) trong app TikTok.
   - Nút tải trực tiếp video final MP4 về máy để đăng thủ công.
   - Nút gửi nháp vào TikTok Inbox (hiển thị trạng thái tắt an toàn theo feature flag).

---

## 3. Kết Quả Kiểm Tra Quality Gate

Toàn bộ 5 bước Quality Gate đều thực thi và vượt qua tuyệt đối (100% PASS):

```text
1. pnpm prisma validate
   ✔ The schema at prisma/schema.prisma is valid 🚀

2. pnpm typecheck
   ✔ $ tsc --noEmit (0 errors)

3. pnpm test
   ✔ Test Files  9 passed (9)
   ✔ Tests       31 passed (31)
     - tests/claim-guard.test.ts (3 tests)
     - tests/tiktok-metrics.test.ts (5 tests)
     - tests/product-scoring.test.ts (2 tests)
     - tests/tiktok-pkce.test.ts (5 tests)
     - tests/product-schema.test.ts (3 tests)
     - tests/gemini-parser.test.ts (2 tests)
     - tests/file-validation.test.ts (2 tests)
     - tests/tiktok-oauth.test.ts (7 tests)
     - tests/crypto-security.test.ts (2 tests)

4. pnpm lint
   ✔ No ESLint warnings or errors

5. pnpm build
   ✔ Creating an optimized production build ...
   ✔ Compiled successfully in 14.0s
   ✔ Generating static pages (29/29)
   ✔ Finalizing page optimization
```

---

## 4. Hướng Dẫn Kiểm Thử Thực Tế Ngoài Sandbox

Khi có TikTok Developer App thật từ TikTok for Developers Portal, thực hiện theo checklist sau:

1. **Đăng ký TikTok Developer App:**
   - Chọn loại ứng dụng: Web Application.
   - Thêm sản phẩm: **Login Kit** và **Display API** (hoặc Content Posting API cho Inbox upload).
   - Thêm Redirect URI: `http://localhost:3000/api/tiktok/callback` (hoặc domain HTTPS nếu TikTok yêu cầu HTTPS trong production).
   - Trong mục Sandbox / Test Accounts: Thêm TikTok username của tài khoản creator dùng để test.
2. **Cấu hình môi trường local:**
   - Thêm vào file `.env.local`:
     ```text
     TIKTOK_CLIENT_KEY="<your_client_key>"
     TIKTOK_CLIENT_SECRET="<your_client_secret>"
     TIKTOK_REDIRECT_URI="http://localhost:3000/api/tiktok/callback"
     TIKTOK_DRAFT_UPLOAD_ENABLED="false" # Đặt "true" nếu app đã được cấp quyền video.upload
     ```
3. **Thử nghiệm trên Studio:**
   - Truy cập `http://localhost:3000/settings` -> Bấm "Bắt đầu Kết Nối TikTok (OAuth PKCE)".
   - Cấp quyền trên màn hình đăng nhập của TikTok.
   - Trình duyệt chuyển về `/settings` với thông báo kết nối thành công.
   - Bấm nút "SYNC NOW" hoặc "Đồng bộ" để lấy số liệu follower và danh sách video.
   - Vào Content Studio để duyệt video, copy caption và gắn giỏ hàng affiliate trên điện thoại.
