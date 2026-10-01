# BÁO CÁO MÔI TRƯỜNG PREFLIGHT (ENVIRONMENT REPORT)

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
- **Trạng thái:** Sẵn sàng cho Phase 2 renderer.

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
