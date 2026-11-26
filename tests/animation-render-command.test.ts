import { describe, it, expect } from "vitest";
import { renderCommandBuilder } from "@/modules/animation/render-command.builder";

describe("RenderCommandBuilder", () => {
  it("should throw error when no scene clips provided", () => {
    expect(() =>
      renderCommandBuilder.buildConcatFilterArgs({
        sceneClips: [],
        outputPath: "/tmp/output.mp4",
      })
    ).toThrow("Không có video cảnh nào để ghép nối");
  });

  it("should construct valid 1080x1920 vertical concat filter for multiple scenes", () => {
    const result = renderCommandBuilder.buildConcatFilterArgs({
      sceneClips: [
        { orderIndex: 1, durationSec: 5, absoluteVideoPath: "/media/scene1.mp4" },
        { orderIndex: 2, durationSec: 6, absoluteVideoPath: "/media/scene2.mp4" },
        { orderIndex: 3, durationSec: 5, absoluteVideoPath: "/media/scene3.mp4" },
      ],
      outputPath: "/media/finals/ep1.mp4",
    });

    expect(result.args).toContain("-i");
    expect(result.args).toContain("/media/scene1.mp4");
    expect(result.args).toContain("/media/scene2.mp4");
    expect(result.args).toContain("/media/scene3.mp4");
    expect(result.concatFilter).toContain("scale=1080:1920:force_original_aspect_ratio=decrease");
    expect(result.concatFilter).toContain("pad=1080:1920");
    expect(result.concatFilter).toContain("concat=n=3:v=1:a=0[outv]");
    expect(result.args).toContain("/media/finals/ep1.mp4");
  });

  it("should map audio track when replaceNativeAudio is true", () => {
    const result = renderCommandBuilder.buildConcatFilterArgs({
      sceneClips: [
        { orderIndex: 1, durationSec: 5, absoluteVideoPath: "/media/scene1.mp4" },
      ],
      audioTracks: [
        { type: "VOICE", absoluteAudioPath: "/media/voice/ep1_voice.wav" },
      ],
      replaceNativeAudio: true,
      outputPath: "/media/finals/ep1_voiced.mp4",
    });

    expect(result.args).toContain("/media/voice/ep1_voice.wav");
    expect(result.args).toContain("-map");
    expect(result.args).toContain("1:a");
    expect(result.args).toContain("-shortest");
  });
});
