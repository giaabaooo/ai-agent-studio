import { describe, it, expect } from "vitest";
import { promptBuilderService, CharacterWithRefs } from "@/modules/animation/prompt-builder.service";
import { CharacterReferenceType } from "@prisma/client";

describe("PromptBuilderService", () => {
  const mockMit: CharacterWithRefs = {
    id: "mit-1",
    name: "Mít",
    role: "Bé trai 5 tuổi",
    appearanceLock: "mặt tròn, tóc đen ngắn, áo vàng mù tạt",
    outfitLock: "quần short xanh ô liu, dép đỏ",
    voiceRule: "giọng bé trai sáng",
    masterPrompt: "MIT, 5-year-old Vietnamese boy",
    negativePrompt: "photorealistic",
    referenceAssets: [
      {
        id: "ref-1",
        referenceType: CharacterReferenceType.FULL_BODY_FRONT,
        localPath: "characters/mit_front.png",
        approved: true,
      },
      {
        id: "ref-2",
        referenceType: CharacterReferenceType.FULL_BODY_THREE_QUARTER,
        localPath: "characters/mit_34.png",
        approved: false, // not approved yet
      },
    ],
  };

  const mockBiBo: CharacterWithRefs = {
    id: "bibo-1",
    name: "Bí Bo",
    role: "Cú nhỏ",
    appearanceLock: "cú nhỏ tròn, lông xanh bạc hà",
    outfitLock: "không mặc đồ",
    voiceRule: "không lời",
    masterPrompt: "BI BO, tiny round mint-green owl",
    negativePrompt: "photorealistic",
    referenceAssets: [],
  };

  it("should detect missing reference types in checklist", () => {
    const checklist = promptBuilderService.buildChecklist(mockMit);
    expect(checklist.characterName).toBe("Mít");
    expect(checklist.approvedCount).toBe(1);
    expect(checklist.isComplete).toBe(false);
    expect(checklist.missingRequiredTypes).toContain(CharacterReferenceType.FULL_BODY_BACK);
    expect(checklist.missingRequiredTypes).toContain(CharacterReferenceType.EXPRESSION);
  });

  it("should build video prompt enforcing Bi Bo strictly nonverbal rule", () => {
    const bundle = promptBuilderService.buildPromptBundle({
      scene: {
        orderIndex: 1,
        startSec: 0,
        endSec: 5,
        durationSec: 5,
        setting: "Ngôi nhà Nắng",
        action: "Mít chuyền cọng đậu que cho Bí Bo dưới gầm bàn",
        dialogue: "Mít: 'Đậu que đi trốn nhé!'",
        emotionDirection: "Tinh nghịch",
        soundDirection: "Tiếng bụp nhỏ",
      },
      characters: [mockMit, mockBiBo],
    });

    expect(bundle.videoPrompt).toContain("SCENE 1 (0–5s)");
    expect(bundle.videoPrompt).toContain("CHARACTER LOCK: MÍT");
    expect(bundle.videoPrompt).toContain("CHARACTER LOCK: BÍ BO");
    expect(bundle.videoPrompt).toContain("STRICT RULE: Bi Bo is strictly nonverbal");
    expect(bundle.videoPrompt).toContain("Keep Bi Bo strictly nonverbal");
    expect(bundle.videoPrompt).toContain("Do not generate written text, subtitles, logos or watermarks");

    // Warnings should flag that Bi Bo has no approved reference
    expect(bundle.warnings.some((w) => w.includes("Bí Bo"))).toBe(true);
    expect(bundle.isReadyForPrompt).toBe(false);
  });
});
