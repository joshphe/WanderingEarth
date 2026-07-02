import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将图片 URL 转为可安全访问的路径
 *
 * 任何域名的图片 URL → 自动重写到 CDN 域名（提取 pathname，拼接 CDN 前缀）。
 * 确保无论数据库中存的是测试域名、打错字的老 CDN 域名还是正确域名，全都指向 cdn.echova.top。
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;

  const cdnDomain = process.env.NEXT_PUBLIC_QINIU_CDN_DOMAIN;
  if (!cdnDomain) {
    // 未配置 CDN → HTTP 走代理，其他透传
    if (/^http:\/\//.test(url)) {
      return `/api/img-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  try {
    const urlObj = new URL(url);
    const cdnObj = new URL(cdnDomain);
    if (urlObj.hostname !== cdnObj.hostname) {
      // 非 CDN 域名 → 提取路径重写到 CDN
      return `${cdnDomain.replace(/\/+$/, "")}${urlObj.pathname}`;
    }
  } catch {
    // 非法 URL，保持原样
  }

  return url;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将经纬度转换为 3D 球面上的坐标
 * @param lat 纬度 (-90 to 90)
 * @param lon 经度 (-180 to 180)
 * @param radius 球体半径
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number
): [number, number, number] {
  // 与 three-globe 库、Three.js SphereGeometry 顶点生成公式保持一致
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

