# Affiliate AI Studio (v1.0)

> Hệ thống AI Account Manager cho TikTok — Local-First, Semi-Auto, Free-First trên macOS.

---

## 1. Giới thiệu dự án

**Affiliate AI Studio** là ứng dụng độc lập dành cho một người dùng duy nhất nhằm xây dựng và phát triển kênh TikTok từ số 0, ứng dụng AI để phân tích sản phẩm, tạo kịch bản UGC 12 giây, quản lý 2 Virtual Creator cố định (**LINH** và **NAM**), kiểm duyệt tuyên bố bằng Claim Guard, xử lý media bằng FFmpeg local và tối ưu hóa chuyển đổi TikTok Affiliate.

### Nguyên tắc cốt lõi:
- **Local-First & Chi phí ~ 0đ:** Chạy PostgreSQL local, lưu media trên ổ cứng Mac, render FFmpeg bằng phần cứng Apple Silicon.
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
- FFmpeg (v6.0 sẵn sàng tại `~/.local/bin/ffmpeg`)

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

---

## 3. Lệnh Kiểm thử & Quality Gate

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

## 4. Tài liệu tham chiếu
- Đặc tả yêu cầu: [Affiliate_AI_Studio_SPEC_VI.md](./Affiliate_AI_Studio_SPEC_VI.md)
- Báo cáo môi trường preflight: [docs/ENVIRONMENT_REPORT.md](./docs/ENVIRONMENT_REPORT.md)
- Ma trận tính năng TikTok: [docs/TIKTOK_CAPABILITIES.md](./docs/TIKTOK_CAPABILITIES.md)
- Báo cáo đánh giá Phase 1: [REVIEW_PACKAGE_PHASE_1.md](./REVIEW_PACKAGE_PHASE_1.md)
