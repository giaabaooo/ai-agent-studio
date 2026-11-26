# REVIEW PACKAGE — PHASE 2 (MEDIA PIPELINE)

**Dự án:** Affiliate AI Studio  
**Ngày hoàn thành:** 2026-10-01  
**Trạng thái:** Hoàn thành và đã kiểm tra quality gate.

## Phạm vi đã triển khai

- Storage key tương đối và metadata `storageProvider`/`machineLabel` cho asset, qua migration `20261001100000_phase_2_media_portability`.
- Upload ảnh, video raw và audio được gắn trực tiếp với creative, đồng thời cập nhật trạng thái production.
- Voice tự tạo bằng macOS `say`; Windows/nguồn TTS ngoài được hỗ trợ bằng chế độ import audio `EXTERNAL`.
- Sinh file SRT từ timeline creative.
- FFmpeg ghép raw video, voice, phụ đề; chuẩn hóa khung hình 1080×1920 và xuất H.264/AAC MP4 vào `media/finals`.
- Content Studio có thao tác tạo/import voice và render final.

## Giới hạn chủ động giữ lại

- ChatGPT/Gemini/Veo vẫn tạo ảnh/video thủ công; không tự động hóa trình duyệt.
- Không upload hoặc đăng TikTok tự động trong Phase 2.
- Final video cần chủ tài khoản kiểm duyệt trước khi đăng.

## Kiểm tra đã chạy

- `pnpm prisma migrate deploy` — pass, migration Phase 2 đã áp dụng vào PostgreSQL local.
- `pnpm prisma validate` — pass.
- `pnpm typecheck` — pass.
- `pnpm test` — 14/14 pass.
- `pnpm lint` — pass.
- `pnpm build` — pass, 26 routes gồm endpoint voice và render.

## Bước kế tiếp

Phase 3: TikTok OAuth, đồng bộ account/video/analytics và luồng upload draft khi quyền API được xác minh.
