import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations — 获取地点列表（支持分页 + 搜索）
export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const search = searchParams.get("search") || undefined;

  const where: any = {};

  if (userId) {
    where.userId = userId;
    // 查看他人数据时，只显示公开地点（且该用户需开放社区）
    if (userId !== session?.user?.id) {
      where.isPublic = true;
      where.user = { isPublic: true };
    }
  } else {
    // 未指定 userId 时，需登录且只返回开放社区用户的公开地点
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    where.isPublic = true;
    where.user = { isPublic: true };
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      include: {
        _count: { select: { photos: true } },
        photos: {
          orderBy: { createdAt: "desc" },
          select: { id: true, url: true, title: true, description: true, takenAt: true, isPublic: true, createdAt: true },
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
    country: loc.country,
    countryCode: loc.countryCode,
    city: loc.city,
    state: loc.state,
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
      isPublic: p.isPublic,
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

  if (latitude == null || longitude == null || !name) {
    return NextResponse.json(
      { error: "缺少必要参数" },
      { status: 400 }
    );
  }

  // 验证经纬度范围
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "经纬度格式错误" },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: "经纬度范围无效" },
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
