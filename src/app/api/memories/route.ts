import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/memories — 一站式创建地点+照片（支持多张照片、公开/私有设置）
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { locationName, latitude, longitude, country, countryCode, city, state } = body;

  // 构建照片列表：优先使用 photos 数组，否则回退单张 photoUrl
  let photosInput: { url: string; title?: string; description?: string; takenAt?: string; isPublic?: boolean }[] = [];

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

  // 公开规则：若用户希望本次记忆公开，则至少需要一张照片设为公开
  let locationIsPublic = body.isPublic !== false; // 默认为 true
  const hasPublicPhoto = photosInput.some((p) => p.isPublic !== false);
  if (locationIsPublic && !hasPublicPhoto) {
    // 用户想公开但没有选任何公开照片，强制改为私有
    locationIsPublic = false;
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
    // 更新公开状态 + 地理字段（原地点可能没有这些字段）
    const updateData: any = {};
    if (locationIsPublic !== existing.isPublic) updateData.isPublic = locationIsPublic;
    if (country && !existing.country) updateData.country = country;
    if (countryCode && !existing.countryCode) updateData.countryCode = countryCode;
    if (city && !existing.city) updateData.city = city;
    if (state && !existing.state) updateData.state = state;
    if (Object.keys(updateData).length > 0) {
      location = await prisma.location.update({
        where: { id: existing.id },
        data: updateData,
      });
    }
  } else {
    location = await prisma.location.create({
      data: {
        latitude,
        longitude,
        name: locationName,
        country: country || null,
        countryCode: countryCode || null,
        city: city || null,
        state: state || null,
        isPublic: locationIsPublic,
        userId: session.user.id,
      },
    });
  }

  // 批量创建照片记录（每张照片独立设置 isPublic）
  const createdPhotos = await Promise.all(
    photosInput.map((p) =>
      prisma.photo.create({
        data: {
          url: p.url.trim(),
          title: p.title?.trim() || null,
          description: p.description?.trim() || null,
          takenAt: p.takenAt ? new Date(p.takenAt) : null,
          isPublic: p.isPublic !== false,
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
        isPublic: location.isPublic,
        photoCount,
        coverUrl: createdPhotos[0]?.url || body.photoUrl,
        photoUrls: allPhotos.map((p) => p.url),
      },
      photos: createdPhotos,
    },
    { status: 201 }
  );
}
