import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const photo = await prisma.photo.create({
    data: {
      url,
      thumbnailUrl: thumbnailUrl || url,
      title,
      description,
      takenAt: takenAt ? new Date(takenAt) : null,
      locationId: params.id,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
