import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations/[id] — 获取地点详情（含所有照片）
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const location = await prisma.location.findUnique({
    where: { id: params.id },
    include: {
      photos: {
        orderBy: { createdAt: "desc" },
      },
      user: {
        select: { name: true, image: true },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "地点不存在" }, { status: 404 });
  }

  return NextResponse.json(location);
}

// DELETE /api/locations/[id] — 删除地点
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });

  if (!location) {
    return NextResponse.json({ error: "地点不存在" }, { status: 404 });
  }

  if (location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }

  await prisma.location.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
