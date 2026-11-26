import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCharacterLocksForText } from "@/modules/animation/prompt-builder.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seriesId } = await params;

    const series = await prisma.animationSeries.findUnique({
      where: { id: seriesId },
      include: {
        characters: true,
        seasons: {
          include: {
            episodes: {
              include: {
                scenes: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!series) {
      return NextResponse.json({ error: "Không tìm thấy bộ phim" }, { status: 404 });
    }

    const characters = series.characters;
    let updatedSceneCount = 0;
    let episodeCount = 0;

    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        episodeCount++;
        for (const scene of episode.scenes) {
          const combinedText = `${scene.action} ${scene.setting || ""} ${scene.dialogue || ""}`;
          const charLocks = getCharacterLocksForText(combinedText, characters);

          const synchronizedPrompt = [
            `Original stylized 3D CGI cartoon animation for children, vertical 9:16 portrait. Disney Pixar animation aesthetic, soft rounded character geometry, warm daylight lighting.`,
            `SETTING: Sunny House cozy atmosphere, ${scene.setting || "wooden room"}.`,
            charLocks,
            `SCENE ACTION: ${scene.action}.`,
            scene.emotionDirection ? `EXPRESSION & MOOD: ${scene.emotionDirection}.` : "",
            `CAMERA & MOTION: child eye-level medium shot or close-up, smooth gentle camera movement, expressive cute character animation, 30fps.`,
            `STRICT CONSTRAINTS: No written text, no subtitles, no captions, no watermarks, no logos, maintain identical character clothing and hairstyle throughout.`,
          ]
            .filter(Boolean)
            .join(" ");

          await prisma.episodeScene.update({
            where: { id: scene.id },
            data: {
              visualPrompt: synchronizedPrompt,
            },
          });
          updatedSceneCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${updatedSceneCount} cảnh trên ${episodeCount} tập phim theo đúng tạo hình nhân vật đã khóa!`,
      episodeCount,
      updatedSceneCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Đồng bộ prompt thất bại" },
      { status: 500 }
    );
  }
}
