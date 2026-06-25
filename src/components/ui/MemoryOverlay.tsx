"use client";

import React from "react";
import { useEarthStore } from "@/lib/store";

/** 格式化日期为中文 */
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return null;
  }
}

export function MemoryOverlay() {
  const expandedMemory = useEarthStore((s) => s.expandedMemory);
  const setExpandedMemory = useEarthStore((s) => s.setExpandedMemory);

  if (!expandedMemory) return null;

  const { pin, photo } = expandedMemory;
  const takenDate = formatDate(photo.takenAt);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedMemory(null);
  };

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={handleClose}
      />

      {/* 卡片 — 屏幕正中，等比例适配分辨率 */}
      <div
        className="relative pointer-events-auto bg-black/95 rounded-2xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
        style={{
          width: "min(380px, 88vw)",
          maxHeight: "88vh",
        }}
      >
        {/* 照片 — 16:10 比例 */}
        <div className="relative w-full shrink-0" style={{ aspectRatio: "16/10" }}>
          <img
            src={photo.url}
            alt={pin.name}
            className="w-full h-full block"
            style={{ objectFit: "cover" }}
          />
          {/* 关闭按钮 */}
          <button
            onClick={(e) => handleClose(e)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80
              text-white text-lg flex items-center justify-center transition-colors border border-white/20"
          >
            ✕
          </button>
        </div>

        {/* 信息区 */}
        <div className="p-4 sm:p-5 overflow-y-auto">
          {/* 地点 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm shrink-0">📍</span>
            <h2 className="text-white text-base sm:text-lg font-bold leading-tight truncate">
              {pin.name}
            </h2>
          </div>

          {/* 经纬度 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm shrink-0">🌐</span>
            <p className="text-slate-400 text-xs font-mono">
              {pin.lat.toFixed(4)}°{pin.lat >= 0 ? "N" : "S"},{" "}
              {pin.lng.toFixed(4)}°{pin.lng >= 0 ? "E" : "W"}
            </p>
          </div>

          {/* 拍摄日期 */}
          {takenDate && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm shrink-0">📅</span>
              <p className="text-slate-300 text-sm">{takenDate}</p>
            </div>
          )}

          {/* 照片标题 */}
          {photo.title && (
            <h3 className="text-white text-sm sm:text-base font-semibold mt-3 mb-2 leading-snug">
              {photo.title}
            </h3>
          )}

          {/* 描述 */}
          {photo.description && (
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-2">
              {photo.description}
            </p>
          )}

          {/* 底部提示 */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-slate-500 text-xs">
              {pin.photoCount} 张旅行记忆
            </span>
            <span className="text-slate-500 text-xs">
              点击空白处收起
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
