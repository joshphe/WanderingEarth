import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET /api/feed?page=1&limit=12 — 社区动态流，无需认证
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));

  try {
    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where: {
          isPublic: true,
          user: { isPublic: true },
          photos: { some: {} }, // 必须有照片
        },
        include: {
          _count: { select: { photos: true, comments: true } },
          photos: {
            orderBy: { createdAt: "desc" },
            select: { url: true },
            take: 1,
          },
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.location.count({
        where: {
          isPublic: true,
          user: { isPublic: true },
          photos: { some: {} },
        },
      }),
    ]);

    const feedItems = items
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        country: loc.country,
        coverUrl: loc.photos[0]?.url || null,
        photoCount: loc._count.photos,
        commentCount: loc._count.comments,
        createdAt: loc.createdAt.toISOString(),
        user: {
          id: loc.user.id,
          name: loc.user.name,
          image: loc.user.image,
        },
      }))
      // 智能混合排序：评论数 > 0 的适当加权靠前
      .sort((a, b) => {
        const scoreA =
          new Date(a.createdAt).getTime() * (1 + a.commentCount * 0.3);
        const scoreB =
          new Date(b.createdAt).getTime() * (1 + b.commentCount * 0.3);
        return scoreB - scoreA;
      });

    return NextResponse.json(
      {
        items: feedItems,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    console.error("获取动态流失败:", e);
    return errorResponse("服务器错误", 500);
  }
}
