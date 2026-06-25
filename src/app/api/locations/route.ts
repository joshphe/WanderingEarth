import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations — 获取地点列表（支持分页 + 搜索）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const search = searchParams.get("search") || undefined;

  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  // 没有 userId 且没有 search 时，默认只返回公开地点
  if (!userId && !search) {
    where.isPublic = true;
  }

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      include: {
        _count: { select: { photos: true } },
        photos: {
          orderBy: { createdAt: "desc" },
          select: { id: true, url: true, title: true, description: true, takenAt: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.location.count({ where }),
  ]);

  const pins = items.map((loc) => ({
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
      id: p.id,
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
      createdAt: p.createdAt,
    })),
  }));

  return NextResponse.json({
    items: pins,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
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
