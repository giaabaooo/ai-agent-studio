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
