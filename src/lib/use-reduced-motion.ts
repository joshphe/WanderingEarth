"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/** 检测用户是否偏好减少动效，供所有组件统一使用 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
