import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将 HTTP 图片 URL 转为安全的 HTTPS 可访问路径
 *
 * 本地开发（localhost HTTP）直接返回原始 URL；
 * 生产环境 HTTP URL 通过 /api/img-proxy 代理，避免 mixed content 拦截。
 * 备案完成后换成自定义 HTTPS 域名后，此函数自动透传。
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://")) {
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

