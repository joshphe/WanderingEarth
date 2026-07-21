import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTOS_PER_USER } from "@/lib/config";

// POST /api/locations/[id]/photos — 添加照片记录
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  // 验证地点属于当前用户
  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });

  if (!location) {
    return NextResponse.json({ error: "地点不存在" }, { status: 404 });
  }

  if (location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const body = await request.json();
  const { url, thumbnailUrl, title, description, takenAt } = body;

  if (!url) {
    return NextResponse.json(
      { error: "缺少照片 URL" },
      { status: 400 }
    );
  }

  // 使用事务保证照片限额检查 + 创建操作的原子性和并发安全
  try {
    const photo = await prisma.$transaction(async (tx) => {
      const currentCount = await tx.photo.count({
        where: { location: { userId: session.user.id } },
      });
      if (currentCount >= MAX_PHOTOS_PER_USER) {
        throw new Error("PHOTO_LIMIT_EXCEEDED");
      }

      return tx.photo.create({
        data: {
          url,
          thumbnailUrl: thumbnailUrl || url,
          title,
          description,
          takenAt: takenAt ? new Date(takenAt) : null,
          locationId: params.id,
        },
      });
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (e: any) {
    if (e?.message === "PHOTO_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: `照片已达上限（${MAX_PHOTOS_PER_USER}张），请删除旧照片后再添加` },
        { status: 400 }
      );
    }
    console.error("添加照片失败:", e);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
