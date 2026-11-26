import { describe, it, expect } from "vitest";
import { docxParserService } from "@/modules/animation/docx-parser.service";
import fs from "fs";

describe("DocxParserService for Animation Studio", () => {
  it("should fail gracefully on empty buffer", async () => {
    const emptyBuf = Buffer.from([]);
    await expect(docxParserService.parseDocx(emptyBuf)).rejects.toThrow();
  });

  it("should parse the 30-episode Xom Mit Na DOCX file completely if present", async () => {
    const docxPath = "/Users/na/Downloads/30 tập xóm Mít Na.docx";
    if (!fs.existsSync(docxPath)) {
      return; // Skip if file not on this machine
    }
    const buf = fs.readFileSync(docxPath);
    const result = await docxParserService.parseDocx(buf);

    expect(result.series.title).toBe("Xóm Mít Na");
    expect(result.series.slug).toBe("xom-mit-na");
    expect(result.characters.length).toBe(4);
    expect(result.characters.map((c) => c.name)).toEqual(["Mít", "Na", "Bí Bo", "Bà Sen"]);

    // Must have parsed 30 episodes
    expect(result.episodes.length).toBe(30);

    // Episode 1 verification
    const ep1 = result.episodes[0];
    expect(ep1.number).toBe(1);
    expect(ep1.title).toContain("Mít Giấu Rau Ở Đâu?");
    expect(ep1.scenes.length).toBe(4);
    expect(ep1.scenes[0].startSec).toBe(0);
    expect(ep1.scenes[0].endSec).toBe(5);
    expect(ep1.scenes[0].durationSec).toBe(5);
    expect(ep1.scenes[0].visualPrompt).toContain("Original stylized 3D cartoon animation");

    // Check Bí Bo voice rule
    const biBo = result.characters.find((c) => c.name === "Bí Bo");
    expect(biBo).toBeDefined();
    expect(biBo?.voiceRule).toContain("Tuyệt đối không có lời thoại tiếng người");
  });

  it("should flag LONG_SCENE warning for scenes longer than 8 seconds", async () => {
    const docxPath = "/Users/na/Downloads/30 tập xóm Mít Na.docx";
    if (!fs.existsSync(docxPath)) return;
    const buf = fs.readFileSync(docxPath);
    const result = await docxParserService.parseDocx(buf);

    const longSceneWarnings = result.warnings.filter((w) => w.type === "LONG_SCENE");
    expect(longSceneWarnings.length).toBeGreaterThan(0);
    expect(longSceneWarnings.some((w) => w.episodeNumber === 1 && w.sceneIndex === 2)).toBe(true);
  });
});
