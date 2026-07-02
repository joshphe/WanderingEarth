"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import NextImage from "next/image";
import { useEarthStore } from "@/lib/store";
import { X, MapPin, Calendar, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoMeta } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";
import { CommentPanel } from "./CommentPanel";

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

  const exploreUserId = useEarthStore((s) => s.exploreUserId);
  const isOwner = exploreUserId === null;
  const [commentPanelOpen, setCommentPanelOpen] = useState(true);

  // 从 pin 中提取统一照片列表
  const photos: PhotoMeta[] = useMemo(() => {
    if (!expandedMemory) return [];
    const { pin } = expandedMemory;
    if (pin.photos && pin.photos.length > 0) return pin.photos;
    if (pin.photoUrls && pin.photoUrls.length > 0) {
      return pin.photoUrls.map((url) => ({ url }));
    }
    if (pin.coverUrl) return [{ url: pin.coverUrl }];
    return [];
  }, [expandedMemory]);

  // 初始照片索引（匹配 mini-card 上展示的那张）
  const initialIndex = useMemo(() => {
    if (!expandedMemory || photos.length === 0) return 0;
    const idx = photos.findIndex((p) => p.url === expandedMemory.photo.url);
    return idx >= 0 ? idx : 0;
  }, [expandedMemory, photos]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // 每次打开新的 expandedMemory 时重置
  useEffect(() => {
    if (expandedMemory) {
      setCurrentIndex(initialIndex);
    }
  }, [expandedMemory, initialIndex]);

  // 关闭 overlay
  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setExpandedMemory(null);
    },
    [setExpandedMemory]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const hasMultiple = photos.length > 1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;

  // 键盘操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedMemory(null);
        return;
      }
      if (!hasMultiple) return;
      if (e.key === "ArrowLeft" && !isFirst) goPrev();
      if (e.key === "ArrowRight" && !isLast) goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, isFirst, isLast, goPrev, goNext, setExpandedMemory]);

  // 触摸滑动
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!hasMultiple) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        if (diff > 0 && !isLast) goNext();
        else if (diff < 0 && !isFirst) goPrev();
      }
    },
    [hasMultiple, isFirst, isLast, goPrev, goNext]
  );

  // ====== early return 必须在所有 hooks 之后 ======
  if (!expandedMemory || photos.length === 0) return null;

  const { pin } = expandedMemory;
  const currentPhoto = photos[currentIndex];
  const takenDate = formatDate(currentPhoto?.takenAt);

  // 箭头按钮样式
  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 glass border border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/10 active:scale-95";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />

      {/* ====== 左右分栏主体 ====== */}
      <div
        className="relative pointer-events-auto flex items-stretch w-full max-w-[96vw] h-[96vh] max-h-[96vh] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 左侧：照片区 */}
        <div
          className="flex flex-col items-center flex-1 min-w-0 min-h-0 pt-4 pb-4 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ====== 顶部工具栏 ====== */}
          <div className="w-full flex items-center justify-between px-2 mb-4 max-w-[700px]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
              <h2 className="text-white/85 text-sm font-semibold truncate">
                {pin.name}
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {hasMultiple && (
                <span className="text-white/35 text-xs tabular-nums tracking-wider">
                  {currentIndex + 1}
                  <span className="text-white/12"> / </span>
                  {photos.length}
                </span>
              )}
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/45 hover:text-white/85
                  flex items-center justify-center transition-all border border-white/5 hover:border-white/15"
                aria-label="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ====== 主照片区 + 左右箭头 ====== */}
          <div className="relative flex items-center justify-center w-full max-w-[700px] flex-1 min-h-0">
            {/* 左箭头（首张不显示） */}
            {hasMultiple && !isFirst && (
              <button
                onClick={goPrev}
                className={`${arrowBtn} left-2`}
                aria-label="上一张"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* 当前照片 */}
            <div className="w-full max-h-full flex items-center justify-center px-4">
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ maxWidth: "100%", maxHeight: "70vh" }}
              >
                <NextImage
                  key={currentPhoto.url}
                  src={getSafeImageUrl(currentPhoto.url)}
                  unoptimized
                  alt={currentPhoto.title || pin.name}
                  width={1200}
                  height={900}
                  className="object-contain max-h-[70vh] w-auto h-auto"
                  style={{ maxHeight: "70vh", width: "auto", height: "auto" }}
                  draggable={false}
                  priority
                />
              </div>
            </div>

            {/* 右箭头（末张不显示） */}
            {hasMultiple && !isLast && (
              <button
                onClick={goNext}
                className={`${arrowBtn} right-2`}
                aria-label="下一张"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ====== 圆点指示器 ====== */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-1.5 mt-3 shrink-0">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "bg-white/80 w-5 h-1.5"
                      : "bg-white/25 hover:bg-white/45 w-1.5 h-1.5"
                  }`}
                  aria-label={`第 ${i + 1} 张照片`}
                />
              ))}
            </div>
          )}

          {/* ====== 当前照片详细信息 ====== */}
          <div className="w-full max-w-[500px] mt-3 px-1 space-y-2 shrink-0">
            {takenDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <p className="text-white/55 text-sm">{takenDate}</p>
              </div>
            )}

            {currentPhoto?.title && (
              <h3 className="text-white/90 text-base sm:text-lg font-semibold leading-snug">
                {currentPhoto.title}
              </h3>
            )}

            {currentPhoto?.description && (
              <p className="text-white/45 text-sm leading-relaxed max-h-20 overflow-y-auto">
                {currentPhoto.description}
              </p>
            )}
          </div>
        </div>

        {/* 右侧：评论面板 */}
        {commentPanelOpen && (
          <CommentPanel
            locationId={pin.id}
            isOwner={isOwner}
            onClose={() => setCommentPanelOpen(false)}
          />
        )}
      </div>

      {/* 收起评论面板时的重新打开按钮 */}
      {!commentPanelOpen && (
        <button
          onClick={() => setCommentPanelOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto
            glass rounded-full p-2.5 text-white/40 hover:text-white/70 transition-all
            border border-white/10 hover:border-white/20"
          title="打开评论"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
