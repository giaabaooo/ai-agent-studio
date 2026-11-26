# BÁO CÁO MÔI TRƯỜNG & MEDIA PIPELINE

**Dự án:** Affiliate AI Studio (Local-First on macOS)  
**Thời gian kiểm tra:** 2026-10-01  
**Hệ điều hành:** macOS (Darwin arm64 - Apple Silicon)  
**Môi trường thực thi:** `/Users/na/Documents/GitHub/ai-agent-studio`

---

## 1. Danh sách công cụ & phiên bản hệ thống

| Công cụ | Phiên bản | Đường dẫn nhị phân | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v24.20.0` | `/usr/local/bin/node` | Sẵn sàng (Active LTS tương thích) |
| **npm** | `11.19.0` | `/usr/local/bin/npm` | Sẵn sàng |
| **pnpm** | `12.8.1` | `/Users/na/.local/bin/pnpm` | Đã cài đặt và kiểm tra hoạt động |
| **PostgreSQL** | `18.6` | `/Library/PostgreSQL/18/bin/postgres` | Cụm dữ liệu chạy độc lập trên Port 5433 |
| **psql / pg_ctl**| `18.6` | `/Users/na/.local/bin/psql` | Đã symlink vào user path |
| **FFmpeg** | `6.0` | `/Users/na/.local/bin/ffmpeg` | Đã cài đặt với libx264, NEON, AAC, libass |
| **Git** | `2.50.1` | `/usr/bin/git` | Đã khởi tạo Git repository (branch `main`) |
| **Python3** | `3.9.6` | `/usr/bin/python3` | Sẵn sàng cho script phụ trợ nếu cần |

---

## 2. Cấu hình Cơ sở dữ liệu Local (PostgreSQL)

- **Cluster Path:** `/Users/na/.local/share/postgres_local/data`
- **Port:** `5433` (được cấu hình chạy trên cổng 5433 độc lập để tuyệt đối không ảnh hưởng đến bất kỳ database/service nào sẵn có trên cổng 5432)
- **Database Name:** `affiliate_ai_studio` (đã tạo thành công qua `createdb`)
- **User:** `postgres` (xác thực trust trên localhost, không yêu cầu mật khẩu nhạy cảm hay quyền sudo root)
- **Connection Test:** Kết nối thành công, `SELECT current_database(), current_user;` trả về `affiliate_ai_studio | postgres`.
- **Database URL:** `postgresql://postgres@localhost:5433/affiliate_ai_studio`

---

## 3. Cấu hình Xử lý Video (FFmpeg)

- **Binary:** `/Users/na/.local/bin/ffmpeg`
- **Kiến trúc:** arm64
- **Tính năng codec:** H.264 (`libx264`), AAC, MP3 (`libmp3lame`), Opus, Subtitles/Captions (`libass`), FreeType font rendering.
- **Trạng thái:** Đã được dùng bởi Phase 2 renderer. App dùng `FFMPEG_PATH=ffmpeg` mặc định để chạy theo PATH; đường dẫn tuyệt đối, nếu cần, chỉ đặt trong `.env.local` của từng máy.

---

## 4. Cấu hình Thư mục Media Local

Đã khởi tạo cấu trúc thư mục local-first theo yêu cầu:
```text
media/
  creators/
    linh/
    nam/
  products/
  generated/
  raw/
  voices/
  subtitles/
  finals/
  thumbnails/
```

Mọi dữ liệu media chỉ lưu trên disk local, không lưu binary vào PostgreSQL.

## 5. Portable Mac / Windows

- Database chỉ lưu storage key tương đối, ví dụ `raw/video-001.mp4`; không lưu đường dẫn tuyệt đối của Mac hay Windows.
- `MACHINE_LABEL` mô tả máy đã tạo/lưu asset (`MAC_OFFICE`, `WINDOWS_HOME`...).
- macOS dùng `VOICE_PROVIDER=MACOS_SAY`; Windows dùng `VOICE_PROVIDER=EXTERNAL` và import file audio đã tạo.
- Thư mục media không được commit vào Git. Code và migration đồng bộ qua Git; media lớn tiếp tục ở Windows theo workflow đã chốt.

---

## 6. Cấu hình Phase 3 — TikTok Connect & Publishing Prep

- **PostgreSQL Migrations:**
  - `20261001103649_init`: Phase 1 core schema.
  - `20261001104618_phase2_media_pipeline`: Phase 2 media assets, versioning, machineLabel.
  - `20261002013545_phase_3_tiktok_connect`: Phase 3 TikTok OAuth Sessions và Publication publishId.
- **Biến môi trường mới:**
  - `TIKTOK_CLIENT_KEY`: Client Key từ TikTok for Developers Portal.
  - `TIKTOK_CLIENT_SECRET`: Client Secret từ TikTok for Developers Portal.
  - `TIKTOK_REDIRECT_URI`: Endpoint callback (mặc định: `http://localhost:3000/api/tiktok/callback`).
  - `TIKTOK_DRAFT_UPLOAD_ENABLED`: Cờ tính năng upload draft vào hộp thư TikTok Inbox (`false` theo mặc định an toàn).
- **Mã hóa Token:** AES-256-GCM với `TOKEN_ENCRYPTION_KEY` 256-bit, lưu token vào `tiktok_oauth_tokens`.
- **Test Suite Status:** 9 test files, 31 tests passed (100% pass với mock sandbox khi không có credentials thật).
