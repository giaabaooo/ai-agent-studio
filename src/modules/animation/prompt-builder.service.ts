import {
  CharacterReferenceType,
} from "@prisma/client";

export interface CharacterWithRefs {
  id: string;
  name: string;
  role: string;
  appearanceLock: string;
  outfitLock: string;
  voiceRule: string;
  masterPrompt: string;
  negativePrompt: string;
  referenceAssets: {
    id: string;
    referenceType: CharacterReferenceType;
    localPath: string;
    approved: boolean;
  }[];
}

export interface PromptBuildInput {
  scene: {
    orderIndex: number;
    startSec: number;
    endSec: number;
    durationSec: number;
    setting?: string | null;
    action: string;
    dialogue?: string | null;
    emotionDirection?: string | null;
    soundDirection?: string | null;
    visualPrompt?: string | null;
    negativePrompt?: string | null;
    continuityNotes?: string | null;
  };
  seriesStyleGuide?: {
    world?: string;
    camera?: string;
    rules?: string;
  } | null;
  characters: CharacterWithRefs[];
}

export interface ReferencePackChecklist {
  characterId: string;
  characterName: string;
  approvedCount: number;
  totalCount: number;
  missingRequiredTypes: CharacterReferenceType[];
  isComplete: boolean;
  approvedAssetPaths: string[];
}

export interface PromptBundleResult {
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  dialogueScript: string;
  audioGuide: string;
  checklist: ReferencePackChecklist[];
  warnings: string[];
  isReadyForPrompt: boolean;
}

const REQUIRED_REFERENCE_TYPES: CharacterReferenceType[] = [
  CharacterReferenceType.FULL_BODY_FRONT,
  CharacterReferenceType.FULL_BODY_THREE_QUARTER,
  CharacterReferenceType.FULL_BODY_BACK,
  CharacterReferenceType.EXPRESSION,
  CharacterReferenceType.BASIC_POSE,
];

export const CHARACTER_LOCK_ENGLISH_PROMPTS = {
  mit: "CHARACTER LOCK - MIT: 5-year-old Vietnamese boy, chubby round rosy cheeks, big round dark-brown eyes, messy short black hair with a single curved curl cowlick on top. Wearing mustard-yellow short-sleeve T-shirt with a small orange jackfruit patch embroidered on chest, olive-green shorts, red sandal straps.",
  na: "CHARACTER LOCK - NA: 7-year-old Vietnamese girl, slender sweet oval face, gentle bright hazel eyes, black shoulder-length hair tied in two neat low braids with light green ribbons. Wearing dusty-pink pinafore dress over white short-sleeve shirt, white sneakers.",
  bibo: "CHARACTER LOCK - BI BO: adorable tiny round mint-green owl chick creature, fluffy ball-shaped body, cream-colored belly with soft subtle speckles, big round amber golden eyes, tiny orange beak, small rounded wings, no clothes.",
  ba_sen: "CHARACTER LOCK - BA SEN: kind loving 65-year-old Vietnamese grandmother, warm gentle face with soft smile and delicate crow's feet, salt-and-pepper grey hair in a neat low bun pinned with a lotus-shaped wooden hairpin. Wearing traditional lotus-pink cotton bà ba blouse, loose dark trousers, wooden sandals.",
};

export function getCharacterLocksForText(
  text: string,
  customCharacters?: { name: string; masterPrompt?: string | null }[]
): string {
  const lower = text.toLowerCase();
  const matched: { id: string; name: string; prompt: string }[] = [];

  const findCustomPrompt = (keyword: string) => {
    if (!customCharacters || customCharacters.length === 0) return null;
    const match = customCharacters.find((c) => c.name.toLowerCase().includes(keyword));
    return match?.masterPrompt?.trim() || null;
  };

  const hasTwoSiblings = lower.includes("hai chị em") || lower.includes("chị em");

  // 1. Mít
  if (lower.includes("mít") || lower.includes("mit") || hasTwoSiblings) {
    const custom = findCustomPrompt("mít") || findCustomPrompt("mit");
    matched.push({
      id: "mit",
      name: "MIT",
      prompt: custom || CHARACTER_LOCK_ENGLISH_PROMPTS.mit,
    });
  }

  // 2. Na
  if (/\bna\b/i.test(lower) || lower.includes("bé na") || lower.includes("chị na") || hasTwoSiblings) {
    const custom = findCustomPrompt("na");
    matched.push({
      id: "na",
      name: "NA",
      prompt: custom || CHARACTER_LOCK_ENGLISH_PROMPTS.na,
    });
  }

  // 3. Bí Bo
  if (lower.includes("bí bo") || lower.includes("bi bo") || lower.includes("cú nhỏ") || lower.includes("chú cú")) {
    const custom = findCustomPrompt("bí bo") || findCustomPrompt("bi bo") || findCustomPrompt("cú");
    matched.push({
      id: "bibo",
      name: "BI BO",
      prompt: custom || CHARACTER_LOCK_ENGLISH_PROMPTS.bibo,
    });
  }

  // 4. Bà Sen (Must not match just 'cánh sen', 'hoa sen', 'hạt sen')
  const hasBaSen =
    lower.includes("bà sen") ||
    lower.includes("ba sen") ||
    lower.includes("người bà") ||
    /\bbà\b/i.test(lower);
  if (hasBaSen) {
    const custom = findCustomPrompt("bà") || findCustomPrompt("sen");
    matched.push({
      id: "ba_sen",
      name: "BA SEN",
      prompt: custom || CHARACTER_LOCK_ENGLISH_PROMPTS.ba_sen,
    });
  }

  // Fallback to Mít if nobody matched
  if (matched.length === 0) {
    const customMit = findCustomPrompt("mít") || findCustomPrompt("mit");
    matched.push({
      id: "mit",
      name: "MIT",
      prompt: customMit || CHARACTER_LOCK_ENGLISH_PROMPTS.mit,
    });
  }

  if (matched.length === 1) {
    return `SINGLE CHARACTER IN SCENE: ${matched[0].prompt}. Maintain exact clothing and hairstyle.`;
  }

  const list = matched.map((m, idx) => `Character ${idx + 1} (${m.name}): ${m.prompt}`).join(" ");
  return `SEPARATE DISTINCT CHARACTERS IN SCENE: ${list}. Strict: keep their respective clothing, hair, and bodies separate, do not merge or blend features between characters.`;
}

export function buildSceneKeyframePrompt(
  scene: {
    action: string;
    setting?: string | null;
    emotionDirection?: string | null;
    dialogue?: string | null;
  },
  customCharacters?: { name: string; masterPrompt?: string | null }[]
): string {
  const combinedText = `${scene.action} ${scene.setting || ""} ${scene.dialogue || ""}`;
  const charLocks = getCharacterLocksForText(combinedText, customCharacters);

  return [
    `Original stylized 3D CGI cartoon animation keyframe for children, vertical 9:16 portrait. Disney Pixar 3D animated movie still, soft rounded character geometry, warm pastel color palette, gentle cinematic daylight lighting.`,
    `SETTING: Sunny House cozy atmosphere, ${scene.setting || "wooden room"}.`,
    charLocks,
    `SCENE ACTION: ${scene.action}.`,
    scene.emotionDirection ? `EXPRESSION & MOOD: ${scene.emotionDirection}.` : "",
    `High-detail Pixar 3D still, vertical 9:16, clean composition, perfectly matching character outfits and hairstyles, no text, no captions, no watermarks, no subtitles.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export class PromptBuilderService {
  buildChecklist(character: CharacterWithRefs): ReferencePackChecklist {
    const approvedTypes = new Set(
      character.referenceAssets
        .filter((ref) => ref.approved)
        .map((ref) => ref.referenceType)
    );

    const approvedAssetPaths = character.referenceAssets
      .filter((ref) => ref.approved)
      .map((ref) => ref.localPath);

    const missingRequiredTypes = REQUIRED_REFERENCE_TYPES.filter(
      (type) => !approvedTypes.has(type)
    );

    return {
      characterId: character.id,
      characterName: character.name,
      approvedCount: approvedTypes.size,
      totalCount: character.referenceAssets.length,
      missingRequiredTypes,
      isComplete: missingRequiredTypes.length === 0,
      approvedAssetPaths,
    };
  }

  buildPromptBundle(input: PromptBuildInput): PromptBundleResult {
    const warnings: string[] = [];
    const checklists = input.characters.map((c) => this.buildChecklist(c));

    // Check references approval
    for (const cl of checklists) {
      if (cl.approvedAssetPaths.length === 0) {
        warnings.push(
          `Nhân vật "${cl.characterName}" chưa có ảnh reference nào được duyệt (APPROVED). Hãy duyệt ảnh tham chiếu trước để đảm bảo tính nhất quán tạo hình.`
        );
      } else if (!cl.isComplete) {
        warnings.push(
          `Nhân vật "${cl.characterName}" thiếu góc ảnh chuẩn: ${cl.missingRequiredTypes.join(", ")}.`
        );
      }
    }

    const scene = input.scene;
    const charList = input.characters.map((c) => ({
      name: c.name,
      masterPrompt: c.masterPrompt,
    }));

    // Image Prompt using synchronized Character Locks
    const imagePrompt = buildSceneKeyframePrompt(scene, charList);

    // Video Prompt (Focused on motion and character action for Image-to-Video / Text-to-Video)
    const videoPrompt = [
      `Original stylized 3D CGI cartoon animation for children, vertical 9:16 portrait. Disney Pixar animation aesthetic, soft rounded character geometry, warm daylight lighting.`,
      `ACTION & MOTION: ${scene.action}.`,
      scene.emotionDirection ? `EXPRESSION & MOOD: ${scene.emotionDirection}.` : "",
      `CAMERA: child eye-level medium shot or close-up, smooth gentle camera movement, cinematic clear staging.`,
      `ANIMATION QUALITY: smooth fluid 3D character motion, expressive cute facial animation, lively natural movements, 30fps.`,
      `STRICT: No written text, no subtitles, no captions, no watermark, no logo, no distorted faces, no extra limbs.`,
    ].filter(Boolean).join(" ");

    // Negative Prompt
    const baseNegative = [
      "photorealistic, real human photography, live action, scary, horror, distorted face, extra limbs, extra fingers, deformed body",
      "written text, title, subtitles, captions, speech bubbles, letters, fonts, logo, brand mark, watermark, frame, border",
      "violent, aggressive, dark grim aesthetic, muted dull gray colors",
    ];

    if (scene.negativePrompt) {
      baseNegative.unshift(scene.negativePrompt);
    }

    const negativePrompt = Array.from(new Set(baseNegative.join(", ").split(",").map((s) => s.trim()))).join(", ");

    // Dialogue script formatted for voice recording
    const dialogueScript = scene.dialogue
      ? `[Cảnh ${scene.orderIndex} (${scene.startSec}s - ${scene.endSec}s)]\n${scene.dialogue}`
      : `[Cảnh ${scene.orderIndex}]: Không có thoại`;

    const audioGuide = [
      scene.soundDirection ? `Âm thanh / SFX: ${scene.soundDirection}` : "",
      scene.emotionDirection ? `Diễn xuất / Cảm xúc: ${scene.emotionDirection}` : "",
    ].filter(Boolean).join("\n");

    const isReadyForPrompt = checklists.every((c) => c.approvedAssetPaths.length > 0);

    return {
      imagePrompt,
      videoPrompt,
      negativePrompt,
      dialogueScript,
      audioGuide,
      checklist: checklists,
      warnings,
      isReadyForPrompt,
    };
  }

  buildFullEpisodePrompt(input: {
    episode: {
      number: number;
      title: string;
      logline?: string | null;
      summary?: string | null;
      targetDurationSec?: number;
      scenes: {
        orderIndex: number;
        setting?: string | null;
        action: string;
        dialogue?: string | null;
        emotionDirection?: string | null;
      }[];
    };
    seriesStyleGuide?: any;
    characters: CharacterWithRefs[];
  }): {
    masterEpisodePrompt: string;
    negativePrompt: string;
    flowSummary: string;
  } {
    const { episode, characters } = input;

    // Character descriptions
    const charSummaries = characters.map((c) => {
      const lock = c.appearanceLock || "";
      const outfit = c.outfitLock || "";
      return `- ${c.name.toUpperCase()}: ${c.role}. ${lock} Outfit: ${outfit}.`;
    }).join("\n");

    // Continuous action flow without harsh scene breaks to prevent character morphing
    const continuousAction = episode.scenes
      .map((s) => s.action.trim().replace(/\.$/, ""))
      .join(". Following smoothly, ");

    const masterEpisodePrompt = [
      `Original stylized 3D CGI cartoon animation for children, vertical 9:16 portrait aspect ratio (1080x1920), warm pastel color palette, soft rounded character geometry, premium cinematic lighting.`,
      `EPISODE TITLE: "Tập ${episode.number}: ${episode.title}".`,
      episode.logline ? `STORYLINE: ${episode.logline}.` : "",
      `SETTING: Sunny House dining area, warm daylight, sunny yellow walls, wooden dining table with green bean dishes and lotus pot in background.`,
      `CHARACTER LOCK (MAINTAIN IDENTICAL APPEARANCE THROUGHOUT ENTIRE VIDEO):\n${charSummaries}`,
      `CONTINUOUS SEAMLESS STORY FLOW (SINGLE CAMERA SEQUENCE, NO MORPHING, CONSISTENT CLOTHING):\n${continuousAction}.`,
      `CINEMATOGRAPHY & ANIMATION: Child eye-level camera, smooth natural body movement, expressive cute emotions, high framerate smooth animation, steady shot without random angle cuts. Maintain identical character clothes and faces across every second.`,
      `STRICT CONSTRAINTS: No photorealism, no live action, no scary expressions, no subtitles, no on-screen text, no watermarks, no logos, no outfit changes. Keep Bi Bo strictly nonverbal.`,
    ].filter(Boolean).join("\n\n");

    // Google Flow Step-by-Step Extend Prompts (for 10-15s extensions)
    const extendPrompts = episode.scenes.map((s, idx) => {
      const isFirst = idx === 0;
      const baseAction = `${s.action}.${s.dialogue ? ` Dialogue: "${s.dialogue.replace(/\n/g, " ")}"` : ""}`;
      const prefix = isFirst
        ? `Original stylized 3D CGI cartoon, vertical 9:16. Sunny House dining table. MIT in yellow T-shirt with jackfruit patch, green shorts. BI BO tiny mint-green owl. BA SEN with silver hair in pink bà ba.`
        : `Continue seamless video animation from previous frame. Keep exact same characters, identical clothing, same room lighting.`;

      const promptText = `${prefix} ACTION: ${baseAction}. Smooth 3D animation, expressive cute facial expressions, no text, no subtitles.`;
      return {
        sceneNumber: s.orderIndex,
        timeRange: `${s.startSec}s – ${s.endSec}s`,
        label: isFirst ? `Phần 1 (0-${s.endSec}s) - Prompt Khởi Đầu` : `Phần ${s.orderIndex} (${s.startSec}s-${s.endSec}s) - Prompt Nối Tiếp (Extend)`,
        prompt: promptText,
      };
    });

    const negativePrompt =
      "photorealistic, real human photography, live action, horror, scary, deformed face, changing clothes, outfit change, extra limbs, extra fingers, distorted geometry, written text, subtitle, watermark, logo, title cards, speech bubbles, blurry, low resolution";

    return {
      masterEpisodePrompt,
      extendPrompts,
      negativePrompt,
      flowSummary: continuousAction,
    };
  }
}

export const promptBuilderService = new PromptBuilderService();
