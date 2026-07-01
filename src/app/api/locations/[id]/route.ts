import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations/[id] — 获取地点详情（含所有照片）
// 仅地点所有者或公开地点可查看
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
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
    return errorResponse("地点不存在", 404);
  }

  // 非公开地点只有所有者本人可查看
  if (!location.isPublic && location.userId !== session?.user?.id) {
    return errorResponse("地点不存在", 404);
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
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });

  if (!location) {
    return errorResponse("地点不存在", 404);
  }

  if (location.userId !== session.user.id) {
    return errorResponse("无权删除", 403);
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
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });

  if (!location) {
    return errorResponse("地点不存在", 404);
  }

  if (location.userId !== session.user.id) {
    return errorResponse("无权操作", 403);
  }

  const body = await request.json();
  const { name, isPublic, country, countryCode, city, state, latitude, longitude } = body;

  const data: any = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return errorResponse("地点名称不能为空", 400);
    }
    data.name = name.trim();
  }

  if (isPublic !== undefined) {
    data.isPublic = Boolean(isPublic);
  }

  if (country !== undefined) data.country = country || null;
  if (countryCode !== undefined) data.countryCode = countryCode || null;
  if (city !== undefined) data.city = city || null;
  if (state !== undefined) data.state = state || null;
  if (latitude !== undefined) data.latitude = latitude;
  if (longitude !== undefined) data.longitude = longitude;

  if (Object.keys(data).length === 0) {
    return errorResponse("无更新内容", 400);
  }

  const updated = await prisma.location.update({
    where: { id: params.id },
    data,
    include: {
      _count: { select: { photos: true } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, title: true, description: true, takenAt: true, isPublic: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    lat: updated.latitude,
    lng: updated.longitude,
    name: updated.name,
    isPublic: updated.isPublic,
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
