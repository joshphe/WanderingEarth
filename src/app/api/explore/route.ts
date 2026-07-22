import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/explore?exclude=userId — 随机选择一个开放社区的用户（排除自己及指定用户），返回其所有公开记忆
// GET /api/explore?userId=xxx — 指定探索某个用户的公开记忆（从社区动态流入口），无需认证
export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") || undefined;
  const excludeUserId = searchParams.get("exclude") || undefined;

  // 指定用户模式：直接返回该用户的公开记忆（社区入口跳转）
  if (targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, image: true },
    });

    if (!user) {
      return errorResponse("用户不存在", 404);
    }

    const locations = await prisma.location.findMany({
      where: {
        isPublic: true,
        userId: targetUserId,
      },
      include: {
        photos: {
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            url: true,
            title: true,
            description: true,
            takenAt: true,
            isPublic: true,
            createdAt: true,
          },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const pins = locations
      .filter((loc) => loc.photos.length > 0)
      .map((loc) => ({
        id: loc.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
        isPublic: loc.isPublic,
        userId: loc.userId,
        createdAt: loc.createdAt.toISOString(),
        photoCount: loc.photos.length,
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
      { user, locations: pins },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  }

  // 原有随机探索逻辑（需登录）
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }
  const currentUserId = session.user.id;

  // 排除自己 + 排除当前正在探索的用户
  const excludeIds = [currentUserId];
  if (excludeUserId && excludeUserId !== currentUserId) {
    excludeIds.push(excludeUserId);
  }

  // 找到所有开放社区的用户的公开地点（至少有一张公开照片）
  const allLocations = await prisma.location.findMany({
    where: {
      isPublic: true,
      user: {
        isPublic: true,
        id: { notIn: excludeIds },
      },
    },
    include: {
      photos: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          url: true,
          title: true,
          description: true,
          takenAt: true,
          isPublic: true,
          createdAt: true,
        },
      },
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // 按用户分组，只保留有公开照片的用户
  const userMap = new Map<
    string,
    { user: { id: string; name: string | null; image: string | null }; locations: typeof allLocations }
  >();

  for (const loc of allLocations) {
    if (loc.photos.length === 0) continue;
    const uid = loc.user.id;
    if (!userMap.has(uid)) {
      userMap.set(uid, { user: loc.user, locations: [] });
    }
    userMap.get(uid)!.locations.push(loc);
  }

  const eligibleUsers = Array.from(userMap.values());

  if (eligibleUsers.length === 0) {
    const msg = excludeUserId
      ? "没有更多可探索的用户了，快邀请朋友加入吧 🌍"
      : "还没有其他用户分享旅行记忆，快邀请朋友加入吧 🌍";
    return NextResponse.json(
      { empty: true, message: msg },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  }

  // 随机选一个用户
  const picked = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];

  // 转换为标准格式
  const pins = picked.locations.map((loc) => ({
    id: loc.id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    name: loc.name,
    isPublic: loc.isPublic,
    userId: loc.userId,
    createdAt: loc.createdAt.toISOString(),
    photoCount: loc.photos.length,
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
      user: {
        id: picked.user.id,
        name: picked.user.name,
        image: picked.user.image,
      },
      locations: pins,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    }
  );
}
