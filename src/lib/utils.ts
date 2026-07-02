import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将图片 URL 转为可安全访问的路径
 *
 * - 七牛旧域名（测试域名、打错字的 CDN 域名）→ 自动重写到 CDN
 * - 外部图床链接 → 原样透传
 * - HTTP URL → 走 /api/img-proxy 代理
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;

  const cdnDomain = process.env.NEXT_PUBLIC_QINIU_CDN_DOMAIN;

  try {
    const urlObj = new URL(url);

    // 已经是 CDN 域名 → 直接透传
    if (cdnDomain) {
      const cdnHostname = new URL(cdnDomain).hostname;
      if (urlObj.hostname === cdnHostname) return url;
    }

    // 七牛相关旧域名 → 重写到 CDN（仅限七牛上传的图片，不影响外部图床）
    const isQiniuLegacy =
      urlObj.hostname.endsWith(".clouddn.com") ||  // 七牛测试域名
      urlObj.hostname === "cdn.echove.top";         // 打错字的旧 CDN
    if (isQiniuLegacy && cdnDomain) {
      return `${cdnDomain.replace(/\/+$/, "")}${urlObj.pathname}`;
    }
  } catch {
    // 非法 URL，保持原样
  }

  // HTTP URL 走代理
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

