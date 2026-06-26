import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 服务端代理地理编码，使用 Photon API（基于 OSM，全球可用）
export async function GET(request: Request) {
  // 速率限制: 每个 IP 每分钟最多 20 次搜索
  const ip = getClientIp(request);
  const limiter = rateLimit(`geocode:${ip}`, 20, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "搜索请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    // Photon API - 基于 OpenStreetMap
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`,
      {
        headers: {
          "User-Agent": "WanderingEarth/1.0",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      throw new Error(`Photon returned ${res.status}`);
    }

    const data = await res.json();

    // 将 Photon GeoJSON 格式转换为 Nominatim 兼容格式
    const results = (data.features || []).map((f: any) => {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];

      // 构建结构化地址
      const address: Record<string, string> = {};
      if (props.city) address.city = props.city;
      if (props.state) address.state = props.state;
      if (props.country) address.country = props.country;
      if (props.countrycode) address.country_code = props.countrycode;

      return {
        display_name: [props.name, props.city, props.state, props.country]
          .filter(Boolean)
          .join(", "),
        name: props.name || props.street || "",
        lat: String(coords[1]),
        lon: String(coords[0]),
        type: props.type || props.osm_value || "",
        address,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("Geocode error:", err);

    // 尝试 Nominatim 作为备选
    try {
      const params = new URLSearchParams({
        format: "json",
        q,
        addressdetails: "1",
        limit: "6",
        "accept-language": "zh,en",
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            "User-Agent": "WanderingEarth/1.0 (travel photos)",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {
      // 两个都失败
    }

    return NextResponse.json(
      { error: "搜索服务暂不可用，请检查网络后重试" },
      { status: 502 }
    );
  }
}
