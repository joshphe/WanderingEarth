import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
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
    // 未指定 userId 时
    if (!session?.user?.id) {
      // 访客模式：返回最多 15 个随机公开地点
      const publicLocations = await prisma.location.findMany({
        where: {
          isPublic: true,
          user: { isPublic: true },
        },
        include: {
          _count: { select: { photos: true } },
          photos: {
            orderBy: { createdAt: "desc" },
            select: { id: true, url: true, title: true, description: true, takenAt: true, isPublic: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100, // 取最近 100 条，再在前端随机打乱选 15
      });

      // 过滤掉没有照片的地点，随机选取最多 15 个
      const withPhotos = publicLocations.filter((loc) => loc._count.photos > 0);
      const shuffled = withPhotos.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 15);

      const pins = selected.map((loc) => ({
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
        createdAt: loc.createdAt.toISOString(),
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

      return NextResponse.json(
        { items: pins, total: pins.length, page: 1, totalPages: 1 },
        {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
          },
        }
      );
    }
    // 已登录但未指定 userId：返回开放社区用户的公开地点
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
    createdAt: loc.createdAt.toISOString(),
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

  return NextResponse.json(
    {
      items: pins,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    }
  );
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
    return errorResponse("缺少必要参数", 400);
  }

  // 验证经纬度范围
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return errorResponse("经纬度格式错误", 400);
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return errorResponse("经纬度范围无效", 400);
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
