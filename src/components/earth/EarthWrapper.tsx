"use client";

import { type ReactNode } from "react";
import { useEarthStore } from "@/lib/store";

const PANEL_WIDTH = 400;

/**
 * 当右侧登录面板打开时，地球通过 GPU 加速的 transform 平滑左移
 */
export function EarthWrapper({ children }: { children: ReactNode }) {
  const authPanelOpen = useEarthStore((s) => s.authPanelOpen);

  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        transform: authPanelOpen ? `translateX(-${PANEL_WIDTH / 2}px)` : "translateX(0)",
        transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
