import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/memories — 一站式创建地点+照片
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const {
    locationName,
    latitude,
    longitude,
    photoUrl,
    title,
    description,
    takenAt,
  } = body;

  if (!locationName || !latitude || !longitude || !photoUrl) {
    return NextResponse.json(
      { error: "地点名称、坐标和照片 URL 为必填项" },
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
    include: { photos: { take: 1, select: { url: true } } },
  });

  let location;

  if (existing) {
    // 在已有地点上追加照片
    location = existing;
  } else {
    // 创建新地点
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

  // 创建照片记录
  const photo = await prisma.photo.create({
    data: {
      url: photoUrl,
      title: title || null,
      description: description || null,
      takenAt: takenAt ? new Date(takenAt) : null,
      locationId: location.id,
    },
  });

  // 统计该地点的照片数
  const photoCount = await prisma.photo.count({
    where: { locationId: location.id },
  });

  // 获取所有照片 URL（用于随机展示）
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
        coverUrl: photoUrl,
        photoUrls: allPhotos.map((p) => p.url),
      },
      photo,
    },
    { status: 201 }
  );
}
