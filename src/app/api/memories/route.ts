import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/memories — 一站式创建地点+照片（支持多张照片）
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { locationName, latitude, longitude } = body;

  // 构建照片列表：优先使用 photos 数组，否则回退单张 photoUrl
  let photosInput: { url: string; title?: string; description?: string; takenAt?: string }[] = [];

  if (body.photos && Array.isArray(body.photos) && body.photos.length > 0) {
    photosInput = body.photos.filter((p: any) => p.url && p.url.trim());
  } else if (body.photoUrl && body.photoUrl.trim()) {
    photosInput = [{ url: body.photoUrl, title: body.title, description: body.description, takenAt: body.takenAt }];
  }

  if (!locationName || !latitude || !longitude || photosInput.length === 0) {
    return NextResponse.json(
      { error: "地点名称、坐标和至少一张照片 URL 为必填项" },
      { status: 400 }
    );
  }

  // 查找是否已存在同一用户在此位置的地点（避免重复创建）
  const existing = await prisma.location.findFirst({
    where: {
      userId: session.user.id,
      latitude: { gte: latitude - 0.01, lte: latitude + 0.01 },
      longitude: { gte: longitude - 0.01, lte: longitude + 0.01 },
    },
  });

  let location;

  if (existing) {
    location = existing;
  } else {
    location = await prisma.location.create({
      data: {
        latitude,
        longitude,
        name: locationName,
        isPublic: true,
        userId: session.user.id,
      },
    });
  }

  // 批量创建照片记录
  const createdPhotos = await Promise.all(
    photosInput.map((p) =>
      prisma.photo.create({
        data: {
          url: p.url.trim(),
          title: p.title?.trim() || null,
          description: p.description?.trim() || null,
          takenAt: p.takenAt ? new Date(p.takenAt) : null,
          locationId: location.id,
        },
      })
    )
  );

  const photoCount = await prisma.photo.count({
    where: { locationId: location.id },
  });

  const allPhotos = await prisma.photo.findMany({
    where: { locationId: location.id },
    select: { url: true },
  });

  return NextResponse.json(
    {
      location: {
        id: location.id,
        lat: location.latitude,
        lng: location.longitude,
        name: location.name,
        photoCount,
        coverUrl: createdPhotos[0]?.url || body.photoUrl,
        photoUrls: allPhotos.map((p) => p.url),
      },
      photos: createdPhotos,
    },
    { status: 201 }
  );
}
