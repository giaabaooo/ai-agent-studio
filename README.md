# Affiliate AI Studio (v1.2 — Phase 3 complete)

> Hệ thống AI Account Manager cho TikTok — Local-First, Semi-Auto, Free-First trên macOS.

---

## 1. Giới thiệu dự án

**Affiliate AI Studio** là ứng dụng độc lập dành cho một người dùng duy nhất nhằm xây dựng và phát triển kênh TikTok từ số 0, ứng dụng AI để phân tích sản phẩm, tạo kịch bản UGC 12 giây, quản lý 2 Virtual Creator cố định (**LINH** và **NAM**), kiểm duyệt tuyên bố bằng Claim Guard, xử lý media bằng FFmpeg local và tối ưu hóa chuyển đổi TikTok Affiliate.

### Nguyên tắc cốt lõi:
- **Local-First & Chi phí ~ 0đ:** Chạy PostgreSQL local, media có thể nằm trên Mac hoặc Windows; render FFmpeg tại máy đang giữ media.
- **FREE_ONLY=true:** Chỉ sử dụng quota miễn phí của Gemini API (`gemini-3.8-flash`), không tự động fallback sang các API tính phí.
- **Semi-Auto & Human-in-the-loop:** Tạo prompt chuẩn cho ChatGPT (ảnh) và Veo/Gemini (video) để người dùng tạo thủ công và upload ngược trở lại Studio, không tự động hóa trình duyệt web.
- **Toán học & Chỉ số bằng Code/SQL:** LLM chỉ dùng cho suy luận chiến lược và sáng tạo kịch bản, tuyệt đối không dùng LLM để tính toán cộng trừ chỉ số.

---

## 2. Hướng dẫn cài đặt & Khởi chạy trên macOS

### Yêu cầu môi trường:
- macOS (Apple Silicon arm64 hoặc Intel x64)
- Node.js LTS (v24.x)
- pnpm (12.x)
- PostgreSQL (Đã thiết lập cụm dữ liệu độc lập trên Port 5433)
- FFmpeg có trong `PATH` (hoặc đặt `FFMPEG_PATH` riêng trong `.env.local`)

### Khởi động Database (Nếu cần khởi động lại Mac):
```bash
/Users/na/.local/bin/pg_ctl -D /Users/na/.local/share/postgres_local/data -o "-p 5433" -l /Users/na/.local/share/postgres_local/postgres.log start
```

### Chạy ứng dụng ở môi trường phát triển:
```bash
cd /Users/na/Documents/GitHub/ai-agent-studio
pnpm dev
```
Truy cập: `http://localhost:3000`

## 3. Quy trình Media — Phase 2

1. Tạo concept tại Product Analyst, sau đó copy prompt sang ChatGPT/Gemini/Veo để tạo ảnh/video thủ công.
2. Tại Content Studio, upload ảnh và raw video. Tệp được lưu dưới `MEDIA_ROOT` bằng storage key tương đối và có nhãn máy tạo (`MACHINE_LABEL`).
3. Trên macOS đặt `VOICE_PROVIDER=MACOS_SAY` để tạo voice offline; trên Windows đặt `VOICE_PROVIDER=EXTERNAL`, tạo voice bằng công cụ bạn chọn rồi import WAV/MP3.
4. Chọn **Render final 1080×1920**. App tạo SRT từ timeline, ghép voice (nếu có), burn-in subtitle và xuất MP4 vào `media/finals/`.
5. Xem/kiểm duyệt video final và đăng TikTok thủ công. Chưa có auto-post hoặc auto-gắn sản phẩm.


## 4. Tích Hợp TikTok & Xuất Bản — Phase 3

1. **TikTok OAuth 2.0 PKCE:** Xác thực tài khoản chính thức qua Login Kit với chuẩn PKCE (RFC 7636, challenge `S256`) và CSRF token lưu server-side trong PostgreSQL (`TikTokOAuthSession`).
2. **Mã hóa Token AES-256-GCM:** Toàn bộ access token và refresh token được mã hóa trước khi lưu vào bảng `TikTokOAuthToken`. Hệ thống tự động làm mới access token khi hết hạn.
3. **Đồng bộ Display API & Metrics:** Đọc thông tin creator (`user.info.stats`) và danh sách video (`video.list`). Các tỷ lệ `likeRate`, `commentRate`, `shareRate`, `engagementRate`, `viewVelocity` được tính toán hoàn toàn bằng TypeScript toán học xác định, không dùng LLM.
4. **Chuẩn bị Xuất bản (Publishing Prep):**
   - **Feature Flag Inbox Draft:** Biến môi trường `TIKTOK_DRAFT_UPLOAD_ENABLED="false"` (mặc định tắt an toàn). Khi bật, video `FINAL_RENDERED` có thể đẩy thẳng vào hộp thư nháp của app TikTok với cờ `is_aigc: true`.
   - **Tuyệt đối không Direct Post:** Người dùng luôn là người kiểm duyệt cuối cùng trên app TikTok.
   - **Checklist Giỏ hàng Affiliate thủ công:** Hiển thị tên sản phẩm, SKU và link để người dùng tự chọn giỏ hàng trong app TikTok khi đăng bài (do TikTok không hỗ trợ API gắn giỏ hàng cá nhân).

## 5. Animation Studio — Xóm Mít Na (Phase 4)

Module hoạt hình thiếu nhi sản xuất series **Xóm Mít Na** định dạng video dọc 1080x1920 (9:16):

1. **Upload & Parse DOCX:** Người dùng tải lên file kịch bản Word (ví dụ `30 tập xóm Mít Na.docx`). Hệ thống trích xuất xác định 30 tập, bảng phân cảnh, lời thoại, cảm xúc, âm thanh và visual prompt CGI 3D tiếng Anh.
2. **Review & Confirm Import:** Hệ thống hiển thị bản nháp preview, cảnh báo thời lượng cảnh (>8s) và xác minh quy tắc an toàn. Người dùng bấm `Xác nhận Import` để tạo transactional Series, Season 1, 30 Episodes và 4 Characters.
3. **Character Bible & Reference Approval:** Quản lý quy chuẩn 4 nhân vật: Mít, Na, Bí Bo (khóa không lời thoại tiếng người), Bà Sen. Mỗi nhân vật có checklist góc ảnh chuẩn (`FULL_BODY_FRONT`, `THREE_QUARTER`, `BACK`, `EXPRESSION`, `BASIC_POSE`, `GROUP_HEIGHT_SHEET`). Người dùng duyệt ảnh tham chiếu (APPROVED) trước khi tạo video.
4. **Prompt Bundle từng cảnh:** Prompt video được tự động xây dựng từ style guide chung + character locks + ảnh tham chiếu đã duyệt + hành động cảnh + negative constraints (không watermark, không text, Bí Bo strictly nonverbal).
5. **Asset Upload & Duyệt Video:** Người dùng tạo clip 5-8s bên ngoài (Veo, Gemini, Luma, Kling) rồi upload vào từng scene; bấm `Duyệt (APPROVE)` cho version đạt chuẩn.
6. **Render Preflight & Assembly:** UI chặn render nếu có cảnh chưa có video approved. Khi đủ điều kiện, FFmpeg ghép nối các scene clips, đồng nhất 1080x1920 30fps MP4 có versioning mà không xóa tệp cũ.

## 6. Lệnh Kiểm thử & Quality Gate

```bash
# 1. Kiểm tra tính hợp lệ của Prisma Schema
pnpm prisma validate

# 2. Chạy Typecheck (TypeScript Strict)
pnpm typecheck

# 3. Chạy toàn bộ Unit Tests (Vitest)
pnpm test

# 4. Kiểm tra Lint
pnpm lint

# 5. Build bản phát hành Production
pnpm build
```

---

## 6. Tài liệu tham chiếu
- Đặc tả yêu cầu: [Affiliate_AI_Studio_SPEC_VI.md](./Affiliate_AI_Studio_SPEC_VI.md)
- Báo cáo môi trường preflight: [docs/ENVIRONMENT_REPORT.md](./docs/ENVIRONMENT_REPORT.md)
- Ma trận tính năng TikTok: [docs/TIKTOK_CAPABILITIES.md](./docs/TIKTOK_CAPABILITIES.md)
- Báo cáo đánh giá Phase 1: [REVIEW_PACKAGE_PHASE_1.md](./REVIEW_PACKAGE_PHASE_1.md)
- Báo cáo đánh giá Phase 2: [REVIEW_PACKAGE_PHASE_2.md](./REVIEW_PACKAGE_PHASE_2.md)
- Handoff triển khai Phase 3 cho Gemini/Antigravity: [ANTIGRAVITY_CONTINUE_PHASE_3_VI.md](./ANTIGRAVITY_CONTINUE_PHASE_3_VI.md)
- Báo cáo đánh giá Phase 3: [REVIEW_PACKAGE_PHASE_3.md](./REVIEW_PACKAGE_PHASE_3.md)
