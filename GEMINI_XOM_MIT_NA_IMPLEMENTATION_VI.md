# Lệnh triển khai Xóm Mít Na

## Bối cảnh và mục tiêu

Project root duy nhất là `/Users/na/Documents/GitHub/ai-agent-studio`.

Tạo một module mới có tên **Animation Studio** cho series hoạt hình thiếu nhi **Xóm Mít Na**. Tài liệu nguồn hiện tại là `/Users/na/Downloads/30 tập xóm Mít Na.docx`. Nó có 30 kịch bản mùa 1, quy chuẩn nhân vật, bối cảnh, quy tắc an toàn và prompt cảnh. Hiện chưa có nhân vật, ảnh tham chiếu hay asset video nào.

Mục tiêu của module là: người dùng upload một DOCX kịch bản, hệ thống biến nó thành series, tập và cảnh có thể biên tập; người dùng tạo/duyệt ảnh chuẩn nhân vật trước; sau đó tạo và duyệt asset từng cảnh, lồng tiếng hậu kỳ, render thành video dọc 1080x1920. Không tự động điều khiển trình duyệt Gemini, Veo, ChatGPT hoặc TikTok.

Giữ nguyên toàn bộ Affiliate AI Studio hiện có. Không buộc series hoạt hình dùng `Product`, `VirtualCreator` LINH/NAM, Claim Guard bán hàng, campaign affiliate hay luồng tạo UGC hiện tại. Các module có thể dùng chung hạ tầng media, upload, storage-relative key, voice và FFmpeg nếu phù hợp.

## Điều không được làm

- Không thay đổi hoặc xóa migration cũ; tạo migration mới cho Animation Studio.
- Không đọc, in, sửa hoặc commit `.env.local`, token hay secret.
- Không dùng scraper, private API hay browser automation.
- Không giả vờ DOCX đã được parse đúng: phải hiển thị preview và cho người dùng xác nhận trước khi tạo dữ liệu chính thức.
- Không cho Bí Bo có lời thoại tiếng người.
- Không gộp 48-55 giây thành một lần gọi video AI. Mỗi cảnh phải là một asset độc lập, mặc định 5-8 giây và chỉ một hành động chính.

## Trải nghiệm web cần có

### 1. Trang Series

Tạo route `/animation` và `/animation/series/[seriesId]`.

- Danh sách series, số tập, tiến độ asset và nút `Tạo series`.
- Tạo series bằng cách upload DOCX; chấp nhận `.docx`, kiểm tra MIME, dung lượng và lưu bằng storage key tương đối.
- Sau upload, parse phần text Word ở server thành **bản nháp import**. Không dùng Gemini để đọc cấu trúc DOCX nếu có thể parse xác định bằng code; chỉ dùng Gemini tùy chọn để hỗ trợ đề xuất tách cảnh hoặc phát hiện cấu trúc bất thường.
- Hiển thị preview gồm: tên series, season, danh sách episode, số cảnh/tập, thời lượng, nhân vật và cảnh/câu thoại có lỗi parse.
- Người dùng có ba thao tác: sửa bản nháp, `Xác nhận import`, hoặc hủy. Chỉ xác nhận mới ghi Season/Episode/Scene chính thức.
- Với file Xóm Mít Na, mục tiêu parser là phát hiện 30 heading `TẬP NN. ...`, thông tin tập, bảng phân cảnh, thoại, cảm xúc/diễn xuất, âm thanh và prompt tiếng Anh theo cảnh. Nếu nội dung bảng không đủ chắc chắn, lưu text nguồn vào `sourceContent` và gắn trạng thái `NEEDS_REVIEW`; tuyệt đối không bịa dữ liệu.

### 2. Trang Character Bible

Tạo route `/animation/series/[seriesId]/characters`.

- CRUD nhân vật, có `name`, `role`, `ageDescription`, `appearanceLock`, `outfitLock`, `personality`, `voiceRule`, `colorPalette`, `masterPrompt`, `negativePrompt`, `safetyRules`, `status`.
- Tạo sẵn màn hình để nhập/duyệt 4 nhân vật Mít, Na, Bí Bo, Bà Sen từ phần Quy chuẩn nhân vật trong DOCX; không coi là asset đã duyệt.
- Mỗi nhân vật có checklist bắt buộc trước khi tạo cảnh: ảnh full body chính diện, 3/4, phía sau; ít nhất 5 biểu cảm; tư thế cơ bản. Có thêm group sheet 4 nhân vật để khóa tỷ lệ chiều cao.
- Asset reference phải có trạng thái `DRAFT`, `APPROVED`, `REJECTED`; chỉ `APPROVED` mới được đưa vào prompt bundle. Ảnh tham chiếu được duyệt ưu tiên hơn prompt chữ.
- UI tạo một `Reference Pack` có thể copy: master prompt, negative prompt, danh sách ảnh reference đã duyệt và checklist còn thiếu. Người dùng tạo ảnh trên Gemini/ChatGPT thủ công rồi upload trở lại.

### 3. Trang Episode và storyboard

Tạo route `/animation/episodes/[episodeId]`.

- Header: mã/tên tập, logline, thông điệp, thời lượng mục tiêu, trạng thái và tiến độ.
- Storyboard theo cảnh, sắp xếp kéo-thả hoặc nút tăng/giảm thứ tự. Một scene bao gồm `orderIndex`, `startSec`, `endSec`, `durationSec`, `setting`, `action`, `dialogue`, `emotionDirection`, `soundDirection`, `visualPrompt`, `negativePrompt`, `continuityNotes`, `status`.
- Có thể sửa riêng từng trường sau import. Cảnh phải hiện cờ lỗi nếu khoảng thời gian chồng lấp, thời lượng <= 0, cảnh dài quá 8 giây mà chưa có lý do, hoặc Bí Bo có human dialogue.
- Nút `Copy prompt ảnh` và `Copy prompt video` cho từng cảnh; prompt video được build từ style chung + character locks + reference assets đã duyệt + continuity + hành động cảnh. Không gửi asset/gọi Gemini tự động.
- Người dùng upload keyframe/ảnh tạo hình và raw clip cho từng scene; cho phép nhiều version, chọn một version `APPROVED`.

### 4. Âm thanh và render

- Tách voice track theo cảnh/nhân vật. Lời Mít, Na, Bà Sen là text có thể xuất thành script thu âm; Bí Bo chỉ cho âm thanh không lời như `bo-bo`, `bì?`, hắt hơi, vỗ cánh.
- Có upload voice, SFX, nhạc nền; metadata xác định offset và gain. Không ép dùng macOS Say; cho phép audio external là workflow chuẩn.
- Tạo episode assembly: các scene video đã duyệt + audio tracks + subtitle tùy chọn. Render qua hạ tầng FFmpeg đang có thành 1080x1920 MP4. Chỉ cho render khi mọi scene bắt buộc đều có video approved.
- Không xóa bản final cũ trên filesystem khi render bản mới; version asset và để người dùng chọn final active.

## Data model đề xuất

Thêm các model riêng, có thể đổi tên cho phù hợp conventions Prisma hiện tại:

- `AnimationSeries`: title, slug, sourceDocPath, sourceDocHash, status, styleGuide, safetyRules.
- `AnimationSeason`: seriesId, number, title.
- `AnimationEpisode`: seasonId, number, title, logline, summary, targetDurationSec, sourceContent, parseStatus, status.
- `AnimationCharacter`: seriesId, name, role, appearanceLock, outfitLock, voiceRule, masterPrompt, negativePrompt, status.
- `CharacterReferenceAsset`: characterId, referenceType, localPath, mimeType, approved, version, metadata.
- `EpisodeScene`: episodeId, orderIndex, startSec, endSec, setting, action, dialogue, emotionDirection, soundDirection, visualPrompt, negativePrompt, continuityNotes, status.
- `SceneAsset`: sceneId, assetType (`KEYFRAME`, `RAW_VIDEO`, `VOICE`, `SFX`, `MUSIC`), localPath, version, approved, metadata.
- `EpisodeRender`: episodeId, localPath, version, active, status, renderOptions, metadata.
- `ScriptImportDraft`: seriesId nullable, sourcePath, parsedJson, warnings, status, expiresAt. Có thể xóa draft cũ an toàn sau import/hủy.

Thêm unique/index cho `(seasonId, number)`, `(episodeId, orderIndex)`, `(seriesId, name)` và các truy vấn list phổ biến. Bổ sung enums rõ ràng thay vì string status tự do.

## API đề xuất

- `POST /api/animation/script-imports` upload + parse DOCX trả về draft và warnings.
- `GET/PATCH /api/animation/script-imports/[id]` xem/sửa draft.
- `POST /api/animation/script-imports/[id]/confirm` tạo series/season/episodes/scenes transactionally.
- `GET/POST /api/animation/series`, `GET/PATCH /api/animation/series/[id]`.
- `GET/POST /api/animation/series/[id]/characters` và CRUD reference assets.
- `GET/PATCH /api/animation/episodes/[id]`, CRUD scene và scene assets.
- `GET /api/animation/scenes/[id]/prompt-bundle` để UI copy prompt đã chuẩn hóa.
- `POST /api/animation/episodes/[id]/render` chỉ nhận render options an toàn; kiểm tra asset approved trước render.

Mọi API validate với Zod, trả lỗi tiếng Việt có thể hành động được, kiểm tra đường dẫn theo storage key tương đối, không lộ absolute path/server secret.

## Thứ tự thực hiện bắt buộc

### Phase A — Foundation và DOCX import

1. Đọc `README.md`, schema, media/storage hiện có và các API upload trước khi sửa.
2. Tạo migration mới và module Prisma/service/schema validation cho Animation Studio.
3. Cài thư viện DOCX parser phù hợp nếu thật sự cần; không tự viết parser zip/XML mong manh nếu có giải pháp an toàn. Giới hạn dung lượng/tệp và xử lý lỗi file hỏng.
4. Làm upload DOCX, import draft, preview, xác nhận import, UI Series và Episode cơ bản.
5. Viết unit tests cho parser với fixture nhỏ: headings tập, scene timeline, thiếu field, malformed DOCX/text.

### Phase B — Character Bible và prompt bundle

1. Tạo CRUD nhân vật/reference.
2. Tạo checklist Reference Pack và validation không cho scene prompt dùng asset chưa approved.
3. Tạo prompt builder thuần TypeScript, có test: character locks, scene action, negative constraints, Bí Bo không human speech, không text/watermark.

### Phase C — Storyboard, asset, hậu kỳ

1. Xây scene editor, validation timeline, scene asset upload/version/approve.
2. Tạo voice/SFX/music workflow và render preflight.
3. Tích hợp FFmpeg tái sử dụng theo hướng asset-relative, render có version, kiểm thử command builder bằng mock.

### Phase D — QA và tài liệu

1. Test API/service quan trọng; test parser, timeline, character lock, prompt builder, render preflight.
2. Cập nhật README với workflow: DOCX → review import → Character Bible → reference approval → scene assets → audio → render.
3. Thêm báo cáo `REVIEW_PACKAGE_ANIMATION_STUDIO.md`: phần hoàn thành, giới hạn, lệnh test, dữ liệu demo và bước tạo asset bên ngoài.
4. Chạy `pnpm prisma validate`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`; tự sửa mọi lỗi trước khi kết thúc.
5. Không commit/push. Báo danh sách file thay đổi, migration tạo mới và kết quả quality gate.

## Tiêu chí nghiệm thu MVP

MVP hoàn thành khi người dùng có thể upload DOCX Xóm Mít Na, xem và chỉnh bản import, xác nhận tạo series; tạo/duyệt Reference Pack cho Mít; mở Tập 01 với các cảnh đã import; copy được prompt cảnh mang character lock; upload/duyệt raw video từng cảnh; và UI chặn render nếu thiếu scene asset/reference bắt buộc.

Không cần tạo hình/video AI thật trong MVP. App phải tổ chức đúng workflow để người dùng tạo chúng ngoài Gemini/ChatGPT/Veo rồi upload asset đã duyệt vào hệ thống.
