import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations — 获取地点列表
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const locations = await prisma.location.findMany({
    where: userId ? { userId, isPublic: true } : { isPublic: true },
    include: {
      _count: { select: { photos: true } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { url: true, title: true, description: true, takenAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pins = locations.map((loc) => ({
    id: loc.id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    name: loc.name,
    isPublic: loc.isPublic,
    userId: loc.userId,
    photoCount: loc._count.photos,
    coverUrl: loc.photos[0]?.url || null,
    photoUrls: loc.photos.map((p) => p.url),
    photos: loc.photos.map((p) => ({
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
    })),
  }));

  return NextResponse.json(pins);
}

// POST /api/locations — 创建新地点
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { latitude, longitude, name, isPublic = true } = body;

  if (!latitude || !longitude || !name) {
    return NextResponse.json(
      { error: "缺少必要参数" },
      { status: 400 }
    );
  }

  const location = await prisma.location.create({
    data: {
      latitude,
      longitude,
      name,
      isPublic,
      userId: session.user.id,
    },
  });

  return NextResponse.json(location, { status: 201 });
}
