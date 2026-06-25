import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

/**
 * 截断文件名，保留扩展名
 */
export function truncateFileName(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf(".");
  if (ext === -1) return name.slice(0, maxLen - 3) + "...";
  const extension = name.slice(ext);
  return name.slice(0, maxLen - extension.length - 3) + "..." + extension;
}

/**
 * 格式化文件大小为可读格式
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
