import {
  ParsedScriptPayload,
  ScriptEpisodeDraft,
  ScriptSceneDraft,
  ScriptDialogueDraft,
  ScriptCharacterDraft,
  ScriptImportWarning,
} from "@/lib/schemas/animation.schema";
import { EpisodeParseStatus } from "@prisma/client";

async function convertDocxToHtml(buffer: Buffer): Promise<{ value: string }> {
  try {
    const mammoth = await import("mammoth");
    const mammothObj = mammoth.default || mammoth;
    if (typeof mammothObj.convertToHtml === "function") {
      return await mammothObj.convertToHtml({ buffer });
    }
  } catch (err: any) {
    console.warn("Lỗi khi dùng mammoth, sử dụng fallback:", err?.message);
  }
  // Fallback text extraction if mammoth fails
  const rawText = buffer.toString("utf-8").replace(/<[^>]+>/g, " ");
  return { value: `<p>${rawText}</p>` };
}

// Regex patterns to clean HTML tags and entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimeRange(timeStr: string): { startSec: number; endSec: number; durationSec: number } | null {
  const cleaned = timeStr.replace(/\s+/g, "").replace(/s$/i, "");
  // Match formats like "0–5", "5-16", "0-5s", "16–36s" (support en-dash \u2013, em-dash \u2014, and hyphen -)
  const match = cleaned.match(/^(\d+(?:\.\d+)?)[-–—](\d+(?:\.\d+)?)$/);
  if (match) {
    const startSec = parseFloat(match[1]);
    const endSec = parseFloat(match[2]);
    const durationSec = Math.max(0, Math.round((endSec - startSec) * 10) / 10);
    return { startSec, endSec, durationSec };
  }
  const single = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (single) {
    const sec = parseFloat(single[1]);
    return { startSec: 0, endSec: sec, durationSec: sec };
  }
  return null;
}

const HUMAN_SPEECH_WORDS = new Set([
  "tôi", "mình", "bạn", "chúng ta", "không", "có", "sao", "đi", "đây", "đó", "ở", "gì", "nào", "ạ", "ơi",
  "hello", "yes", "no", "why", "what", "where", "how", "please"
]);

function isHumanSpeech(dialogue: string): boolean {
  const normalized = dialogue.toLowerCase().replace(/["'“”‘’.,!?;:()]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  // Allowed Bí Bo sounds: "bo", "bu", "bi", "bì", "bip", "hắt hơi", "chít", "cúc cu", "oe", "oắt"
  const allowedSounds = new Set(["bo", "bu", "bi", "bì", "bo-bo", "bu-bu", "bù", "bú", "híc", "chít", "éc"]);
  
  for (const w of words) {
    if (HUMAN_SPEECH_WORDS.has(w)) return true;
    if (!allowedSounds.has(w) && w.length > 3 && !w.startsWith("bo") && !w.startsWith("bu") && !w.startsWith("bi")) {
      return true;
    }
  }
  return false;
}

export class DocxParserService {
  async parseDocx(buffer: Buffer): Promise<ParsedScriptPayload> {
    const warnings: ScriptImportWarning[] = [];
    const htmlResult = await convertDocxToHtml(buffer);
    const html = htmlResult.value;

    if (!html || html.length < 50) {
      throw new Error("Tệp DOCX trống hoặc không thể đọc nội dung văn bản");
    }

    // 1. Parse Characters
    const characters = this.parseCharacters(html);

    // 2. Parse Episodes
    const episodes = this.parseEpisodes(html, warnings);

    // 3. Series Metadata
    const titleMatch = html.match(/XÓM MÍT NA/i);
    const seriesTitle = titleMatch ? "Xóm Mít Na" : "Animation Series";
    const seriesSlug = "xom-mit-na";

    return {
      series: {
        title: seriesTitle,
        slug: seriesSlug,
        subtitle: "Hồ sơ nhân vật & Kịch bản Mùa 1",
        seasonNumber: 1,
        styleGuide: {
          world: "Ngôi nhà Nắng, tông màu ấm pastel, ánh sáng tự nhiên dịu nhẹ, 3D hoạt hình phong cách CGI mượt mà cho thiếu nhi, khung hình dọc 9:16.",
          camera: "Góc máy ngang tầm mắt trẻ em, chuyển động mượt mà, bố cục rõ ràng.",
          rules: "Không watermark, không logo, không text tiếng người chèn trong video AI.",
        },
        safetyRules: {
          targetAudience: "3-8 tuổi",
          principles: [
            "Không hù dọa, không bạo lực.",
            "Bí Bo không bao giờ nói tiếng người.",
            "Đồ dùng nguy hiểm (dao, lửa, nước sôi) luôn do người lớn (Bà Sen) thực hiện.",
            "Tôn trọng cảm xúc của trẻ, không ép ăn hay phạt tiêu cực.",
          ],
        },
      },
      characters,
      episodes,
      warnings,
    };
  }

  private parseCharacters(html: string): ScriptCharacterDraft[] {
    const characters: ScriptCharacterDraft[] = [];

    // Default character specs extracted from Section I
    characters.push({
      name: "Mít",
      role: "Nhân vật trung tâm, bé trai 5 tuổi",
      ageDescription: "5 tuổi",
      appearanceLock: "Face: mặt tròn mũm mĩm, má ửng hồng, mắt tròn nâu đen to, lông mày linh hoạt. Hair: tóc đen ngắn, hơi rối tự nhiên, một lọn cong nhỏ trên đỉnh đầu. Body: dáng trẻ nhỏ, đầu hơi lớn hơn tỷ lệ thực, tay chân ngắn, chuyển động nhanh nhưng mềm mại.",
      outfitLock: "Trang phục khóa: áo thun ngắn tay vàng mù tạt, miếng vá hình trái mít cam nhỏ ở ngực; quần short xanh ô liu; dép quai đỏ. Không tự thêm phụ kiện nếu kịch bản không yêu cầu.",
      personality: "Tò mò, nhanh nhảu, tưởng tượng phong phú; đôi lúc hấp tấp nhưng biết nhận lỗi.",
      voiceRule: "Giọng bé trai sáng, cao vừa, nhịp nhanh nhưng rõ, không hét liên tục; khi sợ nói vấp nhẹ. Câu cửa miệng: 'Ối ối ối!'. Gọi bản thân là 'Mít'.",
      colorPalette: ["#E8B33A", "#E77B32", "#78834A", "#D93829"],
      masterPrompt: "MIT, 5-year-old Vietnamese boy, round chubby face, big dark-brown eyes, rosy cheeks, short messy black hair with one curved curl on top, mustard-yellow short-sleeve T-shirt with small orange jackfruit patch on chest, olive-green shorts, red strap sandals, stylized 3D CGI animation, warm lighting, pastel colors.",
      negativePrompt: "realistic human, photographic, adult proportions, extra limbs, deformed face, scary, glasses, hat, backpack, text, logo, watermark",
      safetyRules: "Không tự ý dùng vật sắc nhọn, luôn có sự đồng hành của người lớn khi cần.",
    });

    characters.push({
      name: "Na",
      role: "Người chị, bé gái 7 tuổi",
      ageDescription: "7 tuổi",
      appearanceLock: "Face: mặt trái xoan thanh tú, mắt nâu hạt dẻ sáng, lông mày thanh, nụ cười điềm tĩnh. Hair: đen dài ngang vai, hai bím tóc thấp buộc ruy-băng xanh nhạt. Body: cao hơn Mít một cái đầu, vóc dáng gọn gàng, cử chỉ điềm tĩnh.",
      outfitLock: "Áo thun trắng ngắn tay; váy yếm hồng khói; giày búp bê hoặc sneaker trắng viền xanh nhạt.",
      personality: "Quan sát tốt, chu đáo, thích làm chị; đôi lúc hơi nghiêm hoặc tự tin quá mức.",
      voiceRule: "Giọng bé gái 7 tuổi trong trẻo, ấm, tốc độ vừa phải, câu nói tròn trịa. Thường xưng 'chị Na', gọi 'em Mít'.",
      colorPalette: ["#D99AA6", "#B8DCCB", "#FFFFFF"],
      masterPrompt: "NA, 7-year-old Vietnamese girl, oval face, bright hazel-brown eyes, neat features, black hair in two low braids tied with light-green ribbons, white short-sleeve shirt under dusty-pink pinafore dress, white sneakers with subtle green trim, stylized 3D CGI cartoon animation, cute, gentle cinematic lighting.",
      negativePrompt: "photorealistic, scary, excessive makeup, adult body, messy hair, text, logo, watermark",
      safetyRules: "Hình tượng gương mẫu, biết hướng dẫn và bảo vệ em nhỏ.",
    });

    characters.push({
      name: "Bí Bo",
      role: "Cú nhỏ tròn đồng hành, linh vật",
      ageDescription: "Cú nhỏ sơ sinh",
      appearanceLock: "Body: cú nhỏ tròn lẳn như quả bóng nỉ, cao ngang đầu gối Mít. Feathers: lông xanh bạc hà mềm, bụng màu kem có đốm nhỏ. Eyes: mắt to tròn màu hổ phách, viền mắt kem. Beak: mỏ cam nhỏ hơi khoằm. Wings: hai cánh ngắn tròn. Không mặc quần áo.",
      outfitLock: "Không mặc quần áo; giữ nguyên bộ lông xanh bạc hà và bụng kem tự nhiên.",
      personality: "Tò mò, trung thành, hơi nhút nhát nhưng nghịch ngợm, thích khám phá thức ăn lạ.",
      voiceRule: "Tuyệt đối không có lời thoại tiếng người; chỉ dùng âm thanh cú hoạt hình không lời: 'bo-bo', 'bì?', 'bu… bu!', hắt hơi, vỗ cánh, lắc đầu.",
      colorPalette: ["#9EDCC4", "#F3E6C9", "#D99A36", "#FF7A00"],
      masterPrompt: "BI BO, tiny round mint-green owl creature, spherical body, soft fluffy mint-green feathers, cream-colored belly with subtle faint spots, huge round amber eyes with wide pupils, tiny curved orange beak, short round wings, no clothes, extremely cute, expressive, nonverbal pet companion, stylized 3D CGI animation.",
      negativePrompt: "realistic predatory owl, sharp scary talons, teeth, human mouth, clothes, text, subtitles, watermark",
      safetyRules: "Chỉ tương tác an toàn với trẻ em, không cắn hay gây thương tích.",
    });

    characters.push({
      name: "Bà Sen",
      role: "Người bà ấm áp, người lớn duy nhất xuất hiện",
      ageDescription: "Khoảng 70 tuổi",
      appearanceLock: "Face: mặt phúc hậu, nếp nhăn đuôi mắt khi cười, mắt nâu hiền, răng đều tự nhiên. Hair: tóc bạc trắng xen sợi đen, búi thấp gọn sau gáy, cài trâm gỗ hoa sen nhỏ. Body: dáng hơi đậm, lưng thẳng vừa, bước đi khoan thai.",
      outfitLock: "Áo bà ba cotton hồng sen hoặc nâu nhạt; quần lụa đen hoặc nâu sẫm ống rộng; guốc gỗ quai nhung đen.",
      personality: "Ấm áp, kiên nhẫn, hài hước nhẹ, để trẻ tự khám phá và chỉ gợi mở.",
      voiceRule: "Giọng người bà miền quê ấm áp, trầm vừa, chậm rãi, dỗ dành nhưng dứt khoát khi cần an toàn.",
      colorPalette: ["#D98C9A", "#594333", "#E5D4C0"],
      masterPrompt: "BA SEN, kind warm Vietnamese grandmother about 70 years old, gentle face with friendly smile wrinkles, soft warm eyes, silver-grey hair tied in a neat low bun with a carved lotus wooden hairpin, traditional lotus-pink cotton ao ba ba blouse, dark-brown trousers, wooden sandals, stylized 3D CGI animation.",
      negativePrompt: "photorealistic, frail, scary old woman, modern clothes, text, watermark",
      safetyRules: "Người duy nhất được phép xử lý bếp lửa, kéo, dao, nước sôi trong các cảnh sinh hoạt.",
    });

    return characters;
  }

  private parseEpisodes(html: string, warnings: ScriptImportWarning[]): ScriptEpisodeDraft[] {
    const episodes: ScriptEpisodeDraft[] = [];

    // Split HTML by episode headings: TẬP \d+
    const epHeadingRegex = /<h[1-4][^>]*>\s*TẬP\s+(\d+)[\.:\s]+([^<]+)<\/h[1-4]>/gi;
    const matches: { index: number; epNumber: number; epTitle: string; fullMatch: string }[] = [];
    
    let match: RegExpExecArray | null;
    while ((match = epHeadingRegex.exec(html)) !== null) {
      matches.push({
        index: match.index,
        epNumber: parseInt(match[1], 10),
        epTitle: stripHtml(match[2]),
        fullMatch: match[0],
      });
    }

    if (matches.length === 0) {
      // Fallback: look for "TẬP 01.", "TẬP 1." without strictly header tags
      const fallbackRegex = /TẬP\s+(\d+)[\.:\s]+([^\n<]+)/gi;
      while ((match = fallbackRegex.exec(html)) !== null) {
        matches.push({
          index: match.index,
          epNumber: parseInt(match[1], 10),
          epTitle: stripHtml(match[2]),
          fullMatch: match[0],
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : html.length;
      const episodeHtml = html.slice(current.index, nextIndex);

      const parsedEp = this.parseSingleEpisode(current.epNumber, current.epTitle, episodeHtml, warnings);
      episodes.push(parsedEp);
    }

    return episodes;
  }

  private parseSingleEpisode(
    epNumber: number,
    epTitle: string,
    epHtml: string,
    warnings: ScriptImportWarning[]
  ): ScriptEpisodeDraft {
    // Extract metadata
    const storylineMatch = epHtml.match(/Tuyến:\s*<\/strong>([^<]+)/i) || epHtml.match(/Tuyến:?\s*([^<\n]+)/i);
    const targetAgeMatch = epHtml.match(/Độ tuổi[^:]*:\s*<\/strong>([^<]+)/i) || epHtml.match(/Độ tuổi[^:]*:\s*([^<\n]+)/i);
    const charactersMatch = epHtml.match(/Nhân vật:\s*<\/strong>([^<]+)/i) || epHtml.match(/Nhân vật:?\s*([^<\n]+)/i);
    const settingMatch = epHtml.match(/Bối cảnh:\s*<\/strong>([^<]+)/i) || epHtml.match(/Bối cảnh:?\s*([^<\n]+)/i);
    const emotionMatch = epHtml.match(/Cảm xúc chủ đạo:\s*<\/strong>([^<]+)/i) || epHtml.match(/Cảm xúc[^:]*:\s*([^<\n]+)/i);
    const loglineMatch = epHtml.match(/Logline:\s*<\/strong>([^<]+)/i) || epHtml.match(/Logline:?\s*([^<\n]+)/i);
    const summaryMatch = epHtml.match(/Tóm tắt:\s*<\/strong>([^<]+)/i) || epHtml.match(/Tóm tắt:?\s*([^<\n]+)/i);

    const characters = charactersMatch
      ? stripHtml(charactersMatch[1]).split(/[,–-]/).map((c) => c.trim()).filter(Boolean)
      : ["Mít", "Na", "Bí Bo", "Bà Sen"];

    // Extract scenes from the first table in episodeHtml
    const scenes: ScriptSceneDraft[] = [];
    const dialogues: ScriptDialogueDraft[] = [];

    // Extract Prompts from "Prompt AI tạo video"
    const promptsMap = new Map<number, string>();
    const promptRegex = /SCENE\s+(\d+)\s*\(([^)]+)\)\.\s*([^<]+)/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = promptRegex.exec(epHtml)) !== null) {
      const sIndex = parseInt(pMatch[1], 10);
      const promptContent = stripHtml(pMatch[3]);
      promptsMap.set(sIndex, promptContent);
    }

    // Parse tables
    const tableRegex = /<table>([\s\S]*?)<\/table>/gi;
    const tables: string[] = [];
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tableRegex.exec(epHtml)) !== null) {
      tables.push(tMatch[1]);
    }

    if (tables.length > 0) {
      const sceneTable = tables[0];
      const rows = sceneTable.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];

      let sceneCounter = 1;
      for (const row of rows) {
        const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(stripHtml);
        if (cells.length < 3) continue;

        // Skip header row
        if (cells[0].includes("Thời gian") || cells[1].includes("Hành động")) continue;

        const timeParsed = parseTimeRange(cells[0]);
        const startSec = timeParsed ? timeParsed.startSec : (sceneCounter - 1) * 6;
        const endSec = timeParsed ? timeParsed.endSec : sceneCounter * 6;
        const durationSec = timeParsed ? timeParsed.durationSec : 6;

        const action = cells[1] || "";
        const dialogue = cells[2] || "";
        const emotionDirection = cells[3] || "";
        const soundDirection = cells[4] || "";

        // Check visual prompt
        const visualPrompt = promptsMap.get(sceneCounter) || `Original stylized 3D cartoon animation for children, vertical 9:16. ACTION: ${action}`;
        const negativePrompt = "realistic human, photographic, scary, deformed limbs, text, logo, watermark, subtitles";

        // Warnings for scene
        if (durationSec <= 0) {
          warnings.push({
            type: "ZERO_DURATION",
            episodeNumber: epNumber,
            sceneIndex: sceneCounter,
            message: `Tập ${epNumber} Cảnh ${sceneCounter}: Thời lượng bằng 0 hoặc không hợp lệ.`,
            severity: "ERROR",
          });
        }

        if (durationSec > 8) {
          warnings.push({
            type: "LONG_SCENE",
            episodeNumber: epNumber,
            sceneIndex: sceneCounter,
            message: `Tập ${epNumber} Cảnh ${sceneCounter}: Thời lượng ${durationSec}s (> 8s). Video AI nên giữ 5-8s cho một hành động chính.`,
            severity: "WARNING",
          });
        }

        // Check if Bí Bo in dialogue has human speech
        if (dialogue.toLowerCase().includes("bí bo:") || dialogue.toLowerCase().includes("bi bo:")) {
          const biBoLine = dialogue.split(/bí bo:/i)[1]?.split("/")[0] || "";
          if (isHumanSpeech(biBoLine)) {
            warnings.push({
              type: "BI_BO_SPEECH",
              episodeNumber: epNumber,
              sceneIndex: sceneCounter,
              message: `Tập ${epNumber} Cảnh ${sceneCounter}: Bí Bo không được có thoại tiếng người! Thoại hiện tại: "${biBoLine.trim()}"`,
              severity: "ERROR",
            });
          }
        }

        // Check overlap with previous scene
        if (scenes.length > 0) {
          const prev = scenes[scenes.length - 1];
          if (startSec < prev.endSec - 0.05) {
            warnings.push({
              type: "TIMELINE_OVERLAP",
              episodeNumber: epNumber,
              sceneIndex: sceneCounter,
              message: `Tập ${epNumber} Cảnh ${sceneCounter} (${startSec}s) bắt đầu trước khi Cảnh ${prev.orderIndex} (${prev.endSec}s) kết thúc.`,
              severity: "WARNING",
            });
          }
        }

        scenes.push({
          orderIndex: sceneCounter,
          startSec,
          endSec,
          durationSec,
          setting: settingMatch ? stripHtml(settingMatch[1]) : "Ngôi nhà Nắng",
          action,
          dialogue: dialogue || null,
          emotionDirection: emotionDirection || null,
          soundDirection: soundDirection || null,
          visualPrompt,
          negativePrompt,
          continuityNotes: null,
        });

        sceneCounter++;
      }
    }

    // Parse Dialogue table if present (second table)
    if (tables.length > 1) {
      const dialogueTable = tables[1];
      const dRows = dialogueTable.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
      for (const dRow of dRows) {
        const dCells = (dRow.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(stripHtml);
        if (dCells.length < 3) continue;
        if (dCells[0].includes("Cảnh") && dCells[1].includes("Nhân vật")) continue;

        const sceneNum = parseInt(dCells[0].replace(/\D/g, ""), 10) || 1;
        const charName = dCells[1];
        const speech = dCells[2];
        const direction = dCells[3] || null;

        if (charName.toLowerCase().includes("bí bo") && isHumanSpeech(speech)) {
          warnings.push({
            type: "BI_BO_SPEECH",
            episodeNumber: epNumber,
            sceneIndex: sceneNum,
            message: `Tập ${epNumber} Bảng thoại Cảnh ${sceneNum}: Bí Bo không được có thoại tiếng người ("${speech}")`,
            severity: "ERROR",
          });
        }

        dialogues.push({
          sceneIndex: sceneNum,
          character: charName,
          dialogue: speech,
          direction,
        });
      }
    }

    // Fallback if no scenes extracted
    if (scenes.length === 0) {
      warnings.push({
        type: "PARSE_AMBIGUITY",
        episodeNumber: epNumber,
        message: `Tập ${epNumber}: Không phát hiện bảng phân cảnh rõ ràng. Đã lưu nội dung gốc vào sourceContent để review thủ công.`,
        severity: "WARNING",
      });

      // Provide a default review scene
      scenes.push({
        orderIndex: 1,
        startSec: 0,
        endSec: 6,
        durationSec: 6,
        setting: "Ngôi nhà Nắng",
        action: stripHtml(summaryMatch ? summaryMatch[1] : epTitle),
        dialogue: null,
        emotionDirection: null,
        soundDirection: null,
        visualPrompt: `Original stylized 3D cartoon animation for children, vertical 9:16. Episode: ${epTitle}`,
        negativePrompt: "photorealistic, text, watermark",
        continuityNotes: null,
      });
    }

    const hasError = warnings.some((w) => w.episodeNumber === epNumber && w.severity === "ERROR");
    const hasWarning = warnings.some((w) => w.episodeNumber === epNumber && w.severity === "WARNING");
    const parseStatus = hasError
      ? EpisodeParseStatus.ERROR
      : hasWarning
      ? EpisodeParseStatus.NEEDS_REVIEW
      : EpisodeParseStatus.PARSED;

    return {
      number: epNumber,
      title: epTitle,
      storyline: storylineMatch ? stripHtml(storylineMatch[1]) : undefined,
      targetAge: targetAgeMatch ? stripHtml(targetAgeMatch[1]) : "3-8 tuổi",
      targetDurationSec: 50,
      characters,
      setting: settingMatch ? stripHtml(settingMatch[1]) : "Ngôi nhà Nắng",
      coreEmotion: emotionMatch ? stripHtml(emotionMatch[1]) : undefined,
      logline: loglineMatch ? stripHtml(loglineMatch[1]) : null,
      summary: summaryMatch ? stripHtml(summaryMatch[1]) : null,
      scenes,
      dialogues,
      parseStatus,
      sourceContent: stripHtml(epHtml).slice(0, 4000),
    };
  }
}

export const docxParserService = new DocxParserService();
