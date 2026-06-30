import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将图片 URL 转为可安全访问的路径
 *
 * HTTP URL（七牛云测试域名）始终走 /api/img-proxy 代理：
 * 1. 绕过 HTTPS 页面 mixed content 拦截
 * 2. 绕过七牛云测试域名的 Content-Disposition: attachment 强制下载
 *
 * 备案后换自定义 HTTPS 域名（如 https://cdn.echova.top）自动透传，不走代理。
 */
export function getSafeImageUrl(url: string): string {
  if (!url) return url;
  // HTTP URL 始终走代理，生产环境防 mixed content + 测试域名强制下载
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

