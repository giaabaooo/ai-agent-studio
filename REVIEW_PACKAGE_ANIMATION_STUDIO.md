# Báo Cáo Nghiệm Thu: Animation Studio — Xóm Mít Na (Phase A–D)

## 1. Tổng quan triển khai

Module **Animation Studio** đã được xây dựng hoàn chỉnh, độc lập và tích hợp trơn tru vào hệ sinh thái hiện tại của `Affiliate AI Studio` theo đúng chỉ thị trong [GEMINI_XOM_MIT_NA_IMPLEMENTATION_VI.md](./GEMINI_XOM_MIT_NA_IMPLEMENTATION_VI.md).

### Workflow cốt lõi:
`Upload DOCX → review/import Season–Episode–Scene → Character Bible → duyệt ảnh reference → prompt theo cảnh → upload/duyệt asset → voice/SFX hậu kỳ → render 9:16`

---

## 2. Các thành phần đã hoàn thành

### Phase A — Foundation & DOCX Parser
- **Prisma Migration mới:** `20261116035208_phase_4_animation_studio`
  - Bổ sung 9 model: `AnimationSeries`, `AnimationSeason`, `AnimationEpisode`, `AnimationCharacter`, `CharacterReferenceAsset`, `EpisodeScene`, `SceneAsset`, `EpisodeRender`, `ScriptImportDraft`.
  - Thêm các Enum an toàn: `SeriesStatus`, `EpisodeParseStatus`, `EpisodeStatus`, `CharacterStatus`, `CharacterReferenceType`, `SceneStatus`, `AnimationAssetType`, `RenderStatus`, `ScriptImportStatus`.
  - Giữ nguyên 100% các model Affiliate hiện có, không làm vỡ các module cũ.
- **DOCX Parser (`docx-parser.service.ts`):**
  - Tích hợp `mammoth` an toàn, xác định, không phụ thuộc LLM.
  - Tự động bóc tách 30 tập kịch bản Mùa 1 từ `30 tập xóm Mít Na.docx`.
  - Bóc tách metadata (Tuyến, Độ tuổi, Bối cảnh, Cảm xúc chủ đạo, Logline, Tóm tắt).
  - Bóc tách bảng phân cảnh (Thời gian, Hành động, Thoại, Cảm xúc, Âm thanh).
  - Trích xuất prompt tiếng Anh chuẩn CGI 3D thiếu nhi cho từng cảnh.
  - Hệ thống cảnh báo an toàn: tự động phát hiện cảnh >8s (`LONG_SCENE`), timeline chồng lấn (`TIMELINE_OVERLAP`), và chặn Bí Bo có thoại người (`BI_BO_SPEECH`).

### Phase B — Character Bible & Prompt Bundle
- **Character Bible (`/animation/series/[id]/characters`):**
  - Quản lý quy chuẩn 4 nhân vật: **Mít**, **Na**, **Bí Bo**, **Bà Sen**.
  - Khóa tạo hình (Appearance Lock), Khóa trang phục (Outfit Lock), Bảng màu hex code, Quy tắc giọng nói.
  - **Quy tắc tuyệt đối:** Bí Bo là nhân vật nonverbal, chỉ dùng tiếng kêu hoạt hình không lời (`bo-bo`, `bu-bu`, `bì?`, `hắt hơi`, `vỗ cánh`), cấm thoại tiếng người.
  - Checklist ảnh tham chiếu 6 góc bắt buộc: `FULL_BODY_FRONT`, `FULL_BODY_THREE_QUARTER`, `FULL_BODY_BACK`, `EXPRESSION`, `BASIC_POSE`, `GROUP_HEIGHT_SHEET`.
  - Cơ chế duyệt ảnh tham chiếu: Trạng thái `DRAFT` và `APPROVED`. Chỉ ảnh `APPROVED` mới được đưa vào prompt bundle.
  - Nút **Copy Reference Pack**: Xuất toàn bộ master prompt, negative prompt và checklist góc ảnh còn thiếu để người dùng dán vào ChatGPT / Midjourney / Gemini.

### Phase C — Storyboard, Asset & FFmpeg Render
- **Storyboard & Scene Editor (`/animation/episodes/[id]`):**
  - Quản lý timeline từng cảnh, bối cảnh, hành động, lời thoại và chỉ đạo cảm xúc/âm thanh.
  - Nút **Copy Prompt Ảnh** (Keyframe) và **Copy Prompt Video** (CGI 3D 9:16 vertical) tích hợp character lock và negative constraints.
  - Quản lý Scene Assets: Hỗ trợ upload nhiều version cho `RAW_VIDEO`, `KEYFRAME`, `VOICE`, `SFX`, `MUSIC`.
  - Nút gạt duyệt video từng cảnh (`APPROVED`).
- **Render Preflight & Assembly:**
  - `validateEpisodeRender`: Chặn render nếu có bất kỳ cảnh nào chưa có video approved.
  - `renderCommandBuilder`: Xây dựng filter FFmpeg chuẩn `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30` ghép nối các clip thành video dọc 9:16 hoàn chỉnh.
  - Versioning render: Lưu bản render mới không xóa bản cũ; người dùng chọn version active.

---

## 3. Danh sách File thay đổi & Tạo mới

### Migration & Database:
- `prisma/schema.prisma` (bổ sung section 11 Animation Studio)
- `prisma/migrations/20261116035208_phase_4_animation_studio/migration.sql`

### Validation Schemas & Services:
- `src/lib/schemas/animation.schema.ts`
- `src/modules/animation/docx-parser.service.ts`
- `src/modules/animation/prompt-builder.service.ts`
- `src/modules/animation/render-command.builder.ts`
- `src/modules/animation/animation.service.ts`
- `src/providers/storage/local-storage.provider.ts` (bổ sung hỗ trợ tệp `.docx`)

### API Routes:
- `src/app/api/animation/script-imports/route.ts`
- `src/app/api/animation/script-imports/[id]/route.ts`
- `src/app/api/animation/script-imports/[id]/confirm/route.ts`
- `src/app/api/animation/series/route.ts`
- `src/app/api/animation/series/[id]/route.ts`
- `src/app/api/animation/series/[id]/characters/route.ts`
- `src/app/api/animation/characters/[id]/route.ts`
- `src/app/api/animation/characters/[id]/references/route.ts`
- `src/app/api/animation/characters/[id]/reference-pack/route.ts`
- `src/app/api/animation/character-references/[id]/route.ts`
- `src/app/api/animation/episodes/[id]/route.ts`
- `src/app/api/animation/episodes/[id]/reorder-scenes/route.ts`
- `src/app/api/animation/scenes/[id]/route.ts`
- `src/app/api/animation/scenes/[id]/assets/route.ts`
- `src/app/api/animation/scenes/[id]/prompt-bundle/route.ts`
- `src/app/api/animation/scene-assets/[id]/route.ts`
- `src/app/api/animation/episodes/[id]/render-preflight/route.ts`
- `src/app/api/animation/episodes/[id]/render/route.ts`
- `src/app/api/media/file/[...path]/route.ts` (bổ sung MIME `.docx`)

### UI Pages & Layout:
- `src/components/layout/sidebar.tsx` (thêm mục menu "Animation Studio")
- `src/app/animation/page.tsx` (Trang chính Animation Studio & Import DOCX)
- `src/app/animation/series/[id]/page.tsx` (Trang chi tiết Series & danh sách 30 tập)
- `src/app/animation/series/[id]/characters/page.tsx` (Trang Character Bible)
- `src/app/animation/episodes/[id]/page.tsx` (Trang Storyboard & Production Studio)

### Unit & Integration Tests:
- `vitest.config.ts` (cấu hình `pool: "forks"` tối ưu Node v24)
- `tests/animation-docx-parser.test.ts` (test parser DOCX)
- `tests/animation-prompt-builder.test.ts` (test prompt builder & nonverbal Bí Bo)
- `tests/animation-render-command.test.ts` (test FFmpeg filter builder)
- `tests/animation-service.test.ts` (test render preflight & approval logic)

---

## 4. Kết quả Quality Gate

Tất cả các bài kiểm tra chất lượng đều vượt qua thành công:

1. **Prisma Validate:**
   ```bash
   pnpm prisma validate
   # Output: The schema at prisma/schema.prisma is valid 🚀
   ```

2. **TypeScript Compilation (Strict):**
   ```bash
   pnpm typecheck
   # Output: Exited with code 0. Zero errors.
   ```

3. **Vitest Test Suite:**
   ```bash
   pnpm test
   # Output: 13 test files passed, 42 tests passed in 990ms.
   ```

4. **Dữ liệu Demo & Nghiệm thu MVP Tập 01:**
   - Series **Xóm Mít Na** (slug: `xom-mit-na`) đã được import chính thức với 30 tập phim vào PostgreSQL local.
   - 4 nhân vật Mít, Na, Bí Bo, Bà Sen đã có trong Character Bible.
   - Nhân vật Mít đã được đính kèm và duyệt ảnh tham chiếu (APPROVED).
   - Tập 01 ("Mít Giấu Rau Ở Đâu?") có đầy đủ 4 cảnh với prompt CGI 3D 9:16 và kịch bản thoại.
   - Preflight render chặn đúng quy tắc khi cảnh chưa có video raw approved.

---

## 5. Hướng dẫn người dùng thao tác bên ngoài (AI Tools)

1. **Tạo ảnh nhân vật (Character Bible):**
   - Vào `/animation/series/[seriesId]/characters`.
   - Chọn nhân vật &rarr; Bấm **Copy Reference Pack**.
   - Dán vào ChatGPT / Midjourney / Gemini Imagen để tạo các góc: chính diện, 3/4, sau lưng, biểu cảm.
   - Tải ảnh về và upload vào ô **Upload Ảnh** trên hệ thống, sau đó bấm **Duyệt (APPROVE)**.
2. **Tạo video cảnh (Storyboard):**
   - Mở Tập phim (ví dụ Tập 01) tại `/animation/episodes/[episodeId]`.
   - Tại Cảnh 1, bấm **Copy Prompt Video (CGI 9:16)**.
   - Dán vào Veo 2 / Luma Dream Machine / Kling AI / Runway để sinh clip 5-8 giây.
   - Tải video MP4 về và bấm **Upload Clip Raw**, sau đó bấm **Duyệt (APPROVE)**.
3. **Render tập phim:**
   - Sau khi duyệt đủ video cho tất cả các cảnh, bấm nút **Render Video 9:16 (FFmpeg)**.
   - Hệ thống tự động ghép nối thành video dọc 1080x1920 và cho phép tải về máy.
