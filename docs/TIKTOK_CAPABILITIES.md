# MA TRẬN KHẢ NĂNG TIKTOK API CHÍNH THỨC (TIKTOK CAPABILITY MATRIX)

**Tài liệu tham chiếu:** TikTok for Developers Official Documentation (TikTok Login Kit, Content Posting API, Display API).  
**Thời điểm đánh giá:** 2026-10-01  
**Trạng thái V1:** SEMI-AUTO + MANUAL PRODUCT LINK (Không giả lập capability không tồn tại).

---

## 1. Xác minh từng Capability

| Tính năng | Scope / API Endpoint | Khả thi trong Dev / Sandbox | Yêu cầu kiểm duyệt (App Review) | Kết luận triển khai V1 |
| :--- | :--- | :--- | :--- | :--- |
| **OAuth 2.0 / Login Kit** | `user.info.basic`, `user.info.profile` | Có | Cần duyệt cho Public users. Trong Sandbox chỉ dùng cho Test Accounts (tối đa 5-10 accounts được gán trong TikTok Developer Portal). | **Hỗ trợ đầy đủ**: Triển khai luồng OAuth Authorization Code với PKCE, lưu token bảo mật bằng AES-256-GCM. |
| **User Statistics** | `user.info.stats` | Có điều kiện | Cần quyền riêng hoặc tài khoản Creator / Business liên kết. | **Hỗ trợ**: Đồng bộ snapshot follower, following, likes, video count. Nếu tài khoản chưa cấp quyền, cho phép nhập hoặc fallback an toàn. |
| **Danh sách Video (Video List)** | `video.list` | Có | Chỉ lấy được danh sách video công khai của tài khoản đã ủy quyền OAuth. | **Hỗ trợ**: Đọc danh sách video của tài khoản chính mình để gắn `tikTokVideoId`. |
| **Chỉ số Video (Video Metrics)** | `video.insights` | Hạn chế | Yêu cầu TikTok Developer App có quyền Business Insights hoặc quyền cao cấp. Thường trả về views, likes, shares, comments. | **Hỗ trợ**: Định kỳ sync các trường views, likes, comments, shares có trong payload. Tính toán các tỷ lệ engagement hoàn toàn bằng code deterministic. |
| **Direct Post Video** | `video.publish` | Rất hạn chế | TikTok kiểm duyệt ngặt nghèo (Security Audit & Production Approval). Sandbox chỉ test được với Creator account đăng ký trước. | **Chưa kích hoạt Direct Post tự động ở V1**. Tránh rủi ro bị từ chối API hoặc vi phạm chính sách đăng bài. |
| **Upload Video Draft (Inbox Draft)** | `video.upload` (`POST /v2/post/publish/inbox/video/init/`) | Khả thi hơn Direct Post | Video được đẩy thẳng vào hộp thư Inbox của app TikTok dưới dạng nháp. Creator mở app TikTok ra duyệt, chỉnh nhạc, và đăng. | **Hỗ trợ ở Phase 3**: Ưu tiên luồng Draft Upload vào Inbox để giữ Approval Gate an toàn. |
| **Nhãn AI Content (AIGC Label)** | `is_aigc: true` trong API payload | Bắt buộc | TikTok yêu cầu mọi nội dung do AI tạo ra phải được khai báo rõ ràng. | **Bắt buộc**: Luôn truyền cờ hoặc nhắc nhở bật nhãn AIGC trên app TikTok để bảo vệ tài khoản khỏi bị bóp tương tác. |
| **Gắn Giỏ hàng Affiliate (Product Link)** | TikTok Shop Open Platform (ISV Enterprise) | **KHÔNG CÓ CHO CÁ NHÂN** | API TikTok Shop Creator Marketplace chỉ dành riêng cho các Partner công ty lớn (ISV) được TikTok Shop cấp phép thương mại. Không có API công khai cho 1 developer cá nhân gắn sản phẩm affiliate vào video cá nhân. | **QUY TẮC BẮT BUỘC V1: MANUAL STEP**. Trên giao diện Studio hiển thị chính xác tên sản phẩm, mã SKU và link. Chủ tài khoản tự chọn giỏ hàng khi duyệt đăng trên app TikTok. |

---

## 2. Quy tắc An toàn Dữ liệu TikTok trong Studio

1. **Không Scraper:** Tuyệt đối không cào dữ liệu qua private API hoặc web cookies không chính thức để tránh bị khóa tài khoản hoặc ban IP.
2. **Mã hóa Token:** Mọi `access_token` và `refresh_token` đều được mã hóa bằng thuật toán chuẩn `AES-256-GCM` với khóa bí mật `TOKEN_ENCRYPTION_KEY` lưu trong biến môi trường server-only.
3. **Approval Gate:** Không có tính năng tự động xuất bản (Full-Auto) trong V1. Chủ tài khoản luôn là người kiểm duyệt nội dung cuối cùng.

---

## 3. Trạng Thái Triển Khai Thực Tế (Phase 3 Implemented)

Hệ thống đã triển khai đầy đủ kiến trúc kết nối và chuẩn bị xuất bản TikTok:

1. **OAuth 2.0 PKCE & Session Store:**
   - Hoàn thành theo chuẩn RFC 7636 với thuật toán challenge `S256`.
   - `code_verifier` (64 ký tự base64url) và `state` chống CSRF được lưu ngắn hạn trên PostgreSQL server-side (`TikTokOAuthSession`) với thời hạn 10 phút, tự động dọn dẹp phiên hết hạn.
   - Endpoint khởi tạo: `GET /api/tiktok/auth?redirect=true`
   - Endpoint callback: `GET /api/tiktok/callback`

2. **Mã hóa Token AES-256-GCM:**
   - Mọi `access_token` và `refresh_token` đều được mã hóa bằng thuật toán `aes-256-gcm` với khóa bí mật `TOKEN_ENCRYPTION_KEY`.
   - Không in hoặc trả về plain token qua bất kỳ API response hay client log nào.
   - Tự động kiểm tra thời hạn và làm mới token (Refresh Token) khi còn dưới 5 phút.

3. **Display API & Deterministic Metrics:**
   - Đồng bộ hồ sơ người dùng (`GET /v2/user/info/`) và lưu snapshot `TikTokAccountSnapshot`.
   - Lấy danh sách video công khai (`POST /v2/video/list/`) và đối chiếu với `Publication`.
   - Tính toán các chỉ số `likeRate`, `commentRate`, `shareRate`, `engagementRate`, `viewVelocity` hoàn toàn bằng TypeScript toán học xác định, không dùng LLM để tính toán tỷ lệ.
   - Endpoint đồng bộ: `POST /api/tiktok/sync`
   - Nút `SYNC NOW` trên TopNav và Settings: Tự động điều hướng đến Settings nếu chưa kết nối OAuth.

4. **TikTok Inbox Draft Upload (Gated Feature Flag):**
   - Triển khai endpoint `POST /api/tiktok/draft/upload`.
   - Được bảo vệ bởi feature flag: `TIKTOK_DRAFT_UPLOAD_ENABLED=false` (mặc định tắt an toàn).
   - Kiểm tra điều kiện ngặt nghèo: Chỉ cho phép upload khi video đã ở trạng thái `FINAL_RENDERED` (1080×1920) và gắn cờ `is_aigc: true`.
   - Video đẩy vào mục TikTok Inbox (hộp thư hệ thống của creator), KHÔNG sử dụng Direct Post.

5. **Quy tắc Gắn Giỏ hàng Affiliate (Bắt buộc Thủ công):**
   - Giao diện Creative Studio hiển thị Checklist kiểm duyệt 5 bước rõ ràng kèm nút copy Caption, thông tin sản phẩm và SKU/URL để người dùng tự chọn giỏ hàng khi duyệt đăng trên app TikTok.
