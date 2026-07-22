"use client";

import { type ReactNode } from "react";
import { useEarthStore } from "@/lib/store";

const PANEL_WIDTH = 400;

/**
 * 当右侧登录面板打开时，地球容器左移腾出空间
 */
export function EarthWrapper({ children }: { children: ReactNode }) {
  const authPanelOpen = useEarthStore((s) => s.authPanelOpen);

  return (
    <div
      className="absolute inset-0 z-0 transition-all duration-300 ease-out"
      style={{ right: authPanelOpen ? PANEL_WIDTH : 0 }}
    >
      {children}
    </div>
  );
}
