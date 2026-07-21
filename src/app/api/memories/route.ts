import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTOS_PER_USER } from "@/lib/config";

// POST /api/memories — 一站式创建地点+照片（支持多张照片、公开/私有设置）
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
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
    return errorResponse("地点名称、坐标和至少一张照片 URL 为必填项", 400);
  }

  // 公开规则：若用户希望本次记忆公开，则至少需要一张照片设为公开
  let locationIsPublic = body.isPublic !== false; // 默认为 true
  const hasPublicPhoto = photosInput.some((p) => p.isPublic !== false);
  if (locationIsPublic && !hasPublicPhoto) {
    // 用户想公开但没有选任何公开照片，强制改为私有
    locationIsPublic = false;
  }

  // 使用事务包裹"照片限额检查 + 查找或创建地点 + 批量创建照片"，保证原子性和并发安全
  try {
    const location = await prisma.$transaction(async (tx) => {
    // 照片上限校验（在事务内保证并发安全）
    const existingPhotoCount = await tx.photo.count({
      where: { location: { userId: session.user.id } },
    });
    if (existingPhotoCount + photosInput.length > MAX_PHOTOS_PER_USER) {
      throw new Error("PHOTO_LIMIT_EXCEEDED");
    }

    // 查找是否已存在同一用户在此位置的地点（避免重复创建）
    const existing = await tx.location.findFirst({
      where: {
        userId: session.user.id,
        latitude: { gte: latitude - 0.01, lte: latitude + 0.01 },
        longitude: { gte: longitude - 0.01, lte: longitude + 0.01 },
      },
    });

    let loc;
    if (existing) {
      loc = existing;
      const updateData: any = {};
      if (locationIsPublic !== existing.isPublic) updateData.isPublic = locationIsPublic;
      if (country && !existing.country) updateData.country = country;
      if (countryCode && !existing.countryCode) updateData.countryCode = countryCode;
      if (city && !existing.city) updateData.city = city;
      if (state && !existing.state) updateData.state = state;
      if (Object.keys(updateData).length > 0) {
        loc = await tx.location.update({
          where: { id: existing.id },
          data: updateData,
        });
      }
    } else {
      loc = await tx.location.create({
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

    // 在事务内串行创建照片（保证全部成功或全部回滚）
    const createdPhotos = [];
    for (const p of photosInput) {
      const photo = await tx.photo.create({
        data: {
          url: p.url.trim(),
          title: p.title?.trim() || null,
          description: p.description?.trim() || null,
          takenAt: p.takenAt ? new Date(p.takenAt) : null,
          isPublic: p.isPublic !== false,
          locationId: loc.id,
        },
      });
      createdPhotos.push(photo);
    }

    return { loc, createdPhotos };
  });

  const { loc: finalLocation, createdPhotos } = location;

  const photoCount = await prisma.photo.count({
    where: { locationId: finalLocation.id },
  });

  const allPhotos = await prisma.photo.findMany({
    where: { locationId: finalLocation.id },
    select: { url: true },
  });

  return NextResponse.json(
    {
      location: {
        id: finalLocation.id,
        lat: finalLocation.latitude,
        lng: finalLocation.longitude,
        name: finalLocation.name,
        isPublic: finalLocation.isPublic,
        photoCount,
        coverUrl: createdPhotos[0]?.url || body.photoUrl,
        photoUrls: allPhotos.map((p) => p.url),
      },
      photos: createdPhotos,
    },
    { status: 201 }
  );
  } catch (e: any) {
    if (e?.message === "PHOTO_LIMIT_EXCEEDED") {
      return errorResponse(
        `照片已达上限（${MAX_PHOTOS_PER_USER}张），请删除旧照片后再添加`,
        400
      );
    }
    console.error("创建记忆失败:", e);
    return errorResponse("服务器错误，请稍后重试", 500);
  }
}
