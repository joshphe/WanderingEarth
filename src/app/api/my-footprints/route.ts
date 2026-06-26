import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/my-footprints — 返回当前用户所有地点，按国家→城市两级分组
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const locations = await prisma.location.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { photos: true } },
      photos: {
        select: { url: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 按国家→城市两级分组
  const countryMap = new Map<
    string,
    {
      country: string;
      countryCode: string | null;
      cities: Map<
        string,
        {
          city: string;
          state: string | null;
          locations: {
            id: string;
            name: string;
            latitude: number;
            longitude: number;
            photoCount: number;
            coverUrl: string | null;
          }[];
        }
      >;
    }
  >();

  for (const loc of locations) {
    const country = loc.country || "未知国家";
    const countryCode = loc.countryCode || null;
    const city = loc.city || "未知城市";
    const state = loc.state || null;

    if (!countryMap.has(country)) {
      countryMap.set(country, {
        country,
        countryCode,
        cities: new Map(),
      });
    }

    const countryEntry = countryMap.get(country)!;
    // 保证 countryCode 取最先遇到的值（未知国家的保持 null）
    if (!countryEntry.countryCode && countryCode) {
      countryEntry.countryCode = countryCode;
    }

    const cityKey = `${city}|${state || ""}`;
    if (!countryEntry.cities.has(cityKey)) {
      countryEntry.cities.set(cityKey, {
        city,
        state,
        locations: [],
      });
    }

    countryEntry.cities.get(cityKey)!.locations.push({
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      photoCount: loc._count.photos,
      coverUrl: loc.photos[0]?.url || null,
    });
  }

  // 转换为排序后的数组结构
  const countries = Array.from(countryMap.values())
    .sort((a, b) => a.country.localeCompare(b.country, "zh-CN"))
    .map((c) => ({
      country: c.country,
      countryCode: c.countryCode,
      cities: Array.from(c.cities.values())
        .sort((a, b) => a.city.localeCompare(b.city, "zh-CN"))
        .map((city) => ({
          city: city.city,
          state: city.state,
          locations: city.locations, // 已按 createdAt desc 排序（来自 findMany）
        })),
    }));

  // 统计
  const totalCities = countries.reduce((sum, c) => sum + c.cities.length, 0);
  const totalLocations = locations.length;

  return NextResponse.json({
    countries,
    stats: {
      countries: countries.length,
      cities: totalCities,
      locations: totalLocations,
    },
  });
}
