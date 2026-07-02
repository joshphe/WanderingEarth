import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将图片 URL 转为可安全访问的路径
 *
 * 旧域名 URL → 重写为新的 CDN HTTPS 域名，不走代理。
 * 其他 HTTP URL 走 /api/img-proxy 代理。
 * HTTPS URL 且不匹配旧域名 → 直接透传。
 *
 * NEXT_PUBLIC_QINIU_LEGACY_DOMAINS 支持逗号分隔多个旧域名
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;

  const cdnDomain = process.env.NEXT_PUBLIC_QINIU_CDN_DOMAIN;
  const legacyDomains = (process.env.NEXT_PUBLIC_QINIU_LEGACY_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  // 旧域名 → 重写为 CDN 域名
  if (cdnDomain) {
    for (const legacy of legacyDomains) {
      if (url.startsWith(legacy)) {
        return url.replace(legacy, cdnDomain);
      }
    }
  }

  // HTTP URL 始终走代理
  if (/^http:\/\//.test(url)) {
    return `/api/img-proxy?url=${encodeURIComponent(url)}`;
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

