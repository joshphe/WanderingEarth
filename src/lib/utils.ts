import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将图片 URL 转为可安全访问的路径
 *
 * 旧测试域名（HTTP）URL → 重写为新的 CDN HTTPS 域名，不走代理。
 * 其他 HTTP URL 走 /api/img-proxy 代理。
 * HTTPS URL 直接透传。
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;

  // 旧七牛测试域名 → 重写为 CDN 域名（避免走代理，消除 403）
  const legacyDomain = process.env.NEXT_PUBLIC_QINIU_LEGACY_DOMAIN;
  const cdnDomain = process.env.NEXT_PUBLIC_QINIU_CDN_DOMAIN;
  if (legacyDomain && cdnDomain && url.startsWith(legacyDomain)) {
    return url.replace(legacyDomain, cdnDomain);
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

