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

// PATCH /api/locations/[id] — 编辑地点名称
export async function PATCH(
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
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "地点名称不能为空" }, { status: 400 });
  }

  const updated = await prisma.location.update({
    where: { id: params.id },
    data: { name: name.trim() },
    include: {
      _count: { select: { photos: true } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, title: true, description: true, takenAt: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    lat: updated.latitude,
    lng: updated.longitude,
    name: updated.name,
    photoCount: updated._count.photos,
    coverUrl: updated.photos[0]?.url || null,
    photoUrls: updated.photos.map((p) => p.url),
    photos: updated.photos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
      createdAt: p.createdAt,
    })),
  });
}
