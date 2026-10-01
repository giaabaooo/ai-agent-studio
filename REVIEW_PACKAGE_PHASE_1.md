# REVIEW PACKAGE — PHASE 1 (CORE LOCAL APP)

**Dự án:** Affiliate AI Studio (TikTok UGC AI Account Manager)  
**Phiên bản:** 1.0 (Phase 1 Complete)  
**Kỹ sư chính:** Antigravity (Gemini 3.8 Flash)  
**Reviewer:** GPT-5.6 Sol  
**Thời điểm tạo:** 2026-10-01  
**Trạng thái Quality Gate:** **100% PASSED** (lint, typecheck, tests, build, prisma validate)

---

## 1. Kiến Trúc Thực Tế Triển Khai (Actual Architecture)

Hệ thống được xây dựng theo mô hình **Modular Monolith Local-First** trên macOS:
- **Framework & Runtime:** Next.js 15.5.26 (App Router), React 19.3, Node.js v24.20.0, TypeScript 5.9 strict.
- **Styling:** Tailwind CSS 3.4 + CSS Variables, tối ưu giao diện dark/light mode, typography hệ thống.
- **Database:** PostgreSQL 18.6 chạy trên **Port 5433** (cụm dữ liệu riêng biệt tại `/Users/na/.local/share/postgres_local/data`, hoàn toàn độc lập với port 5432 mặc định, không cần quyền root/admin, bảo toàn 100% dữ liệu khác trên máy).
- **ORM & Migrations:** Prisma 6.19.3 với 34 bảng quan hệ, enum chuẩn, index tối ưu, decimal cho trường tiền tệ, versioning cho prompt/asset/analysis.
- **AI Engine:** Google Gemini API thông qua SDK chính thức `@google/genai` (v2.25.0) với model mặc định `gemini-3.8-flash`. Ép buộc cơ chế `FREE_ONLY=true`, tự động log token usage vào DB. Nếu chưa cấu hình `GEMINI_API_KEY`, ứng dụng fail-safe có thông báo thân thiện.
- **Bảo Mật:** Mã hóa token bằng chuẩn **AES-256-GCM** với `TOKEN_ENCRYPTION_KEY`. Đăng nhập single-owner dùng mật khẩu băm qua `scrypt` với muối ngẫu nhiên và JWT session cookie bảo mật (`jose`).
- **Media Storage:** Lưu trữ local có kiểm soát dưới thư mục `./media/...` (creators, products, generated, raw, voices, finals, thumbnails). Có cơ chế ngăn chặn path traversal (`..`), kiểm tra kích thước tối đa và MIME type nghiêm ngặt. Phục vụ streaming file qua HTTP Range header cho video.
- **Video & Voice:** FFmpeg 6.0 sẵn sàng tại `~/.local/bin/ffmpeg` (tận dụng Apple Silicon ARM64 NEON). Voice provider baseline: `MacOSSayVoiceProvider` (chắc chắn chạy offline trên macOS).

---

## 2. Danh Sách File Đã Tạo (Created Files Summary)

### Hạ tầng & Cấu hình:
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: Quản lý dependencies với pnpm 12.8.
- `tsconfig.json`: TypeScript strict mode và path alias `@/*`.
- `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`: Cấu hình giao diện và màu sắc HSL studio.
- `.gitignore`, `.env.example`, `.env.local`, `.env`: Quản lý bảo mật biến môi trường.
- `vitest.config.ts`, `.eslintrc.json`: Cấu hình test runner và linter.
- `README.md`, `docs/ENVIRONMENT_REPORT.md`, `docs/TIKTOK_CAPABILITIES.md`.

### Database (Prisma):
- `prisma/schema.prisma`: Đầy đủ 34 bảng quan hệ với `Decimal`, versioning và cascade delete an toàn.
- `prisma/migrations/20261001093042_init_phase_1/migration.sql`: File migration SQL khởi tạo DB.
- `prisma/seed.ts`: Seed tài khoản Owner, 2 Virtual Creator cố định (**LINH** và **NAM**), ảnh reference ban đầu, voice profile và tài khoản TikTok ở stage `NEW`.

### Core Libs & Security:
- `src/lib/env.ts`: Validate và parse biến môi trường bằng Zod.
- `src/lib/db.ts`: Prisma Client singleton.
- `src/lib/security/crypto.ts`: AES-256-GCM mã hóa token & scrypt hashing mật khẩu.
- `src/lib/security/session.ts`: Quản lý session cookie qua `jose`.
- `src/lib/schemas/product.schema.ts`: Zod schema cho form sản phẩm và Gemini Product Analysis.
- `src/lib/schemas/creative.schema.ts`: Zod schema cho kịch bản 12s, shot timeline và Claim Guard.
- `src/lib/scoring/product-scoring.ts`: Thuật toán chấm điểm sản phẩm deterministic 100% bằng code (0 - 10).

### Provider Abstraction:
- `src/providers/ai/ai-provider.interface.ts`
- `src/providers/ai/gemini.provider.ts` (Gemini 3.8 Flash, strict JSON mode, usage logging, FREE_ONLY)
- `src/providers/storage/storage-provider.interface.ts`
- `src/providers/storage/local-storage.provider.ts` (Sanitize filename, path traversal guard, MIME checks)
- `src/providers/voice/voice-provider.interface.ts`
- `src/providers/voice/macos-say.provider.ts` (Chạy local bằng lệnh `say`)

### Domain Modules:
- `src/modules/auth/auth.service.ts`
- `src/modules/creators/creator.service.ts`
- `src/modules/products/product.service.ts`
- `src/modules/creatives/claim-guard.ts` (Deterministic keyword blacklist + regex safety guard)
- `src/modules/creatives/creative.service.ts` (Sinh 3 concepts, versioning, prompts cho ChatGPT & Veo)

### API Route Handlers:
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/creators`, `POST /api/creators/[id]/references`
- `GET /api/products`, `POST /api/products`, `GET /api/products/[id]`, `PATCH /api/products/[id]`
- `POST /api/products/[id]/analyze` (Gemini Product Analyst)
- `POST /api/products/[id]/creatives/generate` (Sinh 3 kịch bản)
- `GET /api/creatives`, `GET /api/creatives/[id]`
- `POST /api/media/upload` (Upload ảnh/video local)
- `GET /api/media/file/[...path]` (HTTP Range streaming file)

### Giao Diện Người Dùng (UI Pages & Components):
- `src/components/layout/sidebar.tsx` (Menu 12 mục theo đúng spec)
- `src/components/layout/top-nav.tsx` (Banner Account Stage `NEW`, cờ `FREE_ONLY`, phím Sync)
- `src/app/layout.tsx`, `src/app/page.tsx`
- `src/app/login/page.tsx`: Giao diện đăng nhập chủ sở hữu.
- `src/app/dashboard/page.tsx`: Tổng quan số liệu, hàng chờ candidate, kịch bản gần nhất, chiến lược AI.
- `src/app/creators/page.tsx`: Tab con `LINH` | `NAM`, Master prompts, Negative prompts, thư viện reference images.
- `src/app/products/page.tsx`: Quản lý kho sản phẩm theo 5 tab (`Candidates`, `Testing`, `Winners`, `Paused`, `Rejected`).
- `src/app/products/new/page.tsx`: Form thêm sản phẩm, kéo thả upload 3-8 ảnh, nút "PHÂN TÍCH SẢN PHẨM", xem điểm số và nút "Sinh 3 Concept Kịch bản".
- `src/app/content/page.tsx`: Content Lab Kanban/List lọc theo Creator & Status, badge Claim Guard.
- `src/app/content/[id]/page.tsx`: Production workspace xem timeline từng giây, copy ChatGPT image prompt, copy Veo video prompt, upload ảnh/video kết quả.
- Placeholders sẵn sàng cho Phase kế tiếp: `/calendar`, `/analytics`, `/analyst`, `/experiments`, `/knowledge`, `/roadmap`, `/finance`, `/settings`.

### Unit Tests:
- `tests/product-schema.test.ts` (3 tests)
- `tests/product-scoring.test.ts` (2 tests)
- `tests/claim-guard.test.ts` (3 tests)
- `tests/gemini-parser.test.ts` (2 tests)
- `tests/crypto-security.test.ts` (2 tests)
- `tests/file-validation.test.ts` (2 tests)

---

## 3. Các Lệnh Đã Chạy & Kết Quả (Quality Gate)

### Lệnh 1: `pnpm prisma validate`
```text
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```
*Kết quả:* **PASS (Exit 0)**

### Lệnh 2: `pnpm typecheck` (`tsc --noEmit`)
```text
$ tsc --noEmit
```
*Kết quả:* **PASS (Exit 0, 0 lỗi TypeScript Strict)**

### Lệnh 3: `pnpm test` (`vitest run`)
```text
 ✓ tests/claim-guard.test.ts (3 tests)
 ✓ tests/product-scoring.test.ts (2 tests)
 ✓ tests/product-schema.test.ts (3 tests)
 ✓ tests/gemini-parser.test.ts (2 tests)
 ✓ tests/file-validation.test.ts (2 tests)
 ✓ tests/crypto-security.test.ts (2 tests)

Test Files  6 passed (6)
Tests       14 passed (14)
Duration    485ms
```
*Kết quả:* **PASS (Exit 0, 14/14 tests Passed)**

### Lệnh 4: `pnpm lint` (`next lint`)
```text
✔ No ESLint warnings or errors
```
*Kết quả:* **PASS (Exit 0, 0 warning, 0 error)**

### Lệnh 5: `pnpm build` (`prisma generate && next build`)
```text
 ✓ Compiled successfully in 10.6s
 ✓ Generating static pages (24/24)
 ✓ Finalizing page optimization
Route (app)                                   Size  First Load JS
├ ƒ /dashboard                               162 B         106 kB
├ ○ /creators                               4.1 kB         107 kB
├ ○ /products                              2.89 kB         109 kB
├ ○ /products/new                          5.33 kB         108 kB
├ ○ /content                               3.09 kB         109 kB
├ ƒ /content/[id]                           4.4 kB         110 kB
...
```
*Kết quả:* **PASS (Exit 0, 24 route biên dịch thành công)**

---

## 4. Git Diff Summary

Commit hash: `adedfe33158abc7319dd9cc07bd2c5b5287ee17a`  
Số file thay đổi: **83 files**, **12,283 insertions(+)**

```text
.env.example                                       |   29 +
.eslintrc.json                                     |    3 +
.gitignore                                         |   49 +
README.md                                          |   67 +
docs/ENVIRONMENT_REPORT.md                         |   62 +
docs/TIKTOK_CAPABILITIES.md                        |   28 +
package.json                                       |   46 +
pnpm-lock.yaml                                     | 5482 ++++++++++++++++++++
prisma/migrations/20261001093042_init_phase_1/...  |  776 +++
prisma/schema.prisma                               |  748 +++
prisma/seed.ts                                     |  161 +
src/app/... (all pages and route handlers)         | 2500+ +
src/lib/... (env, crypto, session, schemas)        |  500+ +
src/modules/... (auth, creators, products, ...)    |  700+ +
src/providers/... (ai, storage, voice)             |  500+ +
tests/... (6 test suites)                          |  300+ +
```

---

## 5. Các Rủi Ro, Giả Định & Vấn Đề Tồn Tại (Risks, Assumptions & Known Issues)

1. **Khóa API Gemini (`GEMINI_API_KEY`):**  
   - Hiện tại file `.env.local` để trống `GEMINI_API_KEY=""`. Hệ thống đã được lập trình để xử lý an toàn (fail gracefully): Khi người dùng bấm "Phân tích sản phẩm" mà chưa có key, hệ thống trả về thông báo lỗi rõ ràng hướng dẫn điền key vào `.env.local`. Khi có key, module sẽ tự động kết nối với model `gemini-3.8-flash`.
2. **Quyền Gắn Giỏ Hàng TikTok Shop (Product Link):**  
   - Đã xác minh trong `docs/TIKTOK_CAPABILITIES.md`: TikTok không có API mở cho tài khoản cá nhân tự động gắn giỏ hàng affiliate. Do đó, theo đúng nguyên tắc của Phase 1, thao tác gắn giỏ hàng là **MANUAL STEP** do người dùng chọn trên app TikTok. Ứng dụng cung cấp đầy đủ tên và link sản phẩm để người dùng chọn nhanh.
3. **Giọng đọc Voice (Phase 2):**  
   - Đã cài đặt `MacOSSayVoiceProvider` (sử dụng lệnh `say` của macOS) làm giải pháp local offline chắc chắn chạy 100% không tốn phí. Ở Phase 2 sẽ ghép trực tiếp vào pipeline FFmpeg.
4. **Hậu kỳ FFmpeg (Phase 2):**  
   - Binary FFmpeg v6.0 đã cài đặt tại `/Users/na/.local/bin/ffmpeg` với đầy đủ libx264, libass và tối ưu Apple Silicon NEON. Script render sẽ được kích hoạt trong Phase 2.

---

## 6. Trạng Thái Hoàn Thành Definition of Done — Phase 1

- [x] App chạy local trên macOS.
- [x] Cơ sở dữ liệu PostgreSQL local chạy trên Port 5433 (độc lập, an toàn).
- [x] Prisma migration chạy thành công (`20261001093042_init_phase_1`).
- [x] Seed thành công User Owner, 2 Virtual Creator **LINH** và **NAM**, Voice profiles, Reference images, và TikTok Account.
- [x] Đăng nhập Single-Owner với session cookie bảo mật (`/login`).
- [x] Giao diện quản lý 2 Creator LINH và NAM với đầy đủ Master Prompts, Negative Prompts và upload reference images.
- [x] Giao diện thêm sản phẩm mới (`/products/new`) với upload 3-8 ảnh, preview tức thì.
- [x] Tích hợp Gemini 3.8 Flash Product Analyst, Zod strict parsing, tính điểm ProductScore deterministic.
- [x] Sinh 3 concept kịch bản 12 giây, kiểm duyệt qua Claim Guard, tạo prompt cho ChatGPT và Veo.
- [x] Lưu trữ kịch bản vào DB kèm versioning và hiển thị trong Content Lab (`/content` & `/content/[id]`).
- [x] `pnpm lint` -> PASS (0 warning, 0 error).
- [x] `pnpm typecheck` -> PASS (0 error).
- [x] `pnpm test` -> PASS (14/14 tests passed).
- [x] `pnpm build` -> PASS (Production build thành công 24/24 routes).
- [x] Tài liệu `REVIEW_PACKAGE_PHASE_1.md` đã sẵn sàng.

---

**DỪNG THEO ĐÚNG LỆNH ĐỂ GPT-5.6 SOL REVIEW.**
Vui lòng cung cấp nội dung này cho GPT-5.6 review. Sau khi GPT-5.6 chấp thuận và bạn xác nhận, chúng ta sẽ bắt đầu Phase 2 (Media Pipeline: Prompts, Uploads, Voice, Subtitles, FFmpeg Render).
