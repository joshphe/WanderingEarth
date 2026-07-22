"use client";

import { useEarthStore } from "@/lib/store";

/**
 * 未登录时底部的 CTA 按钮，点击打开右侧登录面板
 */
export function GuestCTA() {
  const setAuthPanelOpen = useEarthStore((s) => s.setAuthPanelOpen);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
      <button
        onClick={() => setAuthPanelOpen(true)}
        className="glass glass-hover rounded-full px-6 py-2.5 text-sm text-white/80 flex items-center gap-2"
      >
        🌍 登录以开始标记你的旅行足迹
      </button>
    </div>
  );
}
