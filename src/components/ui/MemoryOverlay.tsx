"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useEarthStore } from "@/lib/store";
import { X, MapPin, Calendar } from "lucide-react";
import type { PhotoMeta } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

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

/** 竖/横构图卡片配置 */
const CARD_CONFIG = {
  portrait: { width: 540, imageAspect: "4/5" as const, label: "竖构图" },
  landscape: { width: 680, imageAspect: "16/9" as const, label: "横构图" },
} as const;

type Orientation = "portrait" | "landscape";

/** 检测图片构图方向 */
function detectOrientation(img: HTMLImageElement): Orientation {
  return img.naturalWidth / img.naturalHeight > 1.15 ? "landscape" : "portrait";
}

/** 为每张照片计算散落位置 */
function getCardLayout(
  photoIndex: number,
  currentIndex: number,
  totalCount: number
): { x: number; y: number; rotate: number; scale: number; zIndex: number; opacity: number } {
  const dist = photoIndex - currentIndex;
  const absDist = Math.abs(dist);
  const sign = Math.sign(dist) || 0;

  const xBase = 380;
  const x = sign * absDist * xBase + (absDist > 1 ? sign * (absDist - 1) * 70 : 0);

  const yDir = photoIndex % 2 === 0 ? -1 : 1;
  const y = absDist * 24 * yDir;

  const rotate = sign * absDist * 5;

  const scale = Math.max(0.80, 1 - absDist * 0.12);

  const zIndex = totalCount - absDist;

  const opacity = absDist > 2 ? 0.25 : Math.max(0.4, 1 - absDist * 0.22);

  return { x, y, rotate, scale, zIndex, opacity };
}

export function MemoryOverlay() {
  const expandedMemory = useEarthStore((s) => s.expandedMemory);
  const setExpandedMemory = useEarthStore((s) => s.setExpandedMemory);
  const prefersReducedMotion = useReducedMotion();

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
  const [hasEntered, setHasEntered] = useState(false);
  // 每张照片的构图方向
  const [photoOrientations, setPhotoOrientations] = useState<Record<string, Orientation>>({});

  // 预加载图片并检测构图方向
  useEffect(() => {
    if (!expandedMemory || photos.length === 0) return;
    setPhotoOrientations({});
    photos.forEach((photo) => {
      const img = new Image();
      img.onload = () => {
        setPhotoOrientations((prev) => {
          if (prev[photo.url]) return prev; // 已检测过，跳过
          return { ...prev, [photo.url]: detectOrientation(img) };
        });
      };
      img.onerror = () => {
        // 加载失败默认竖构图
        setPhotoOrientations((prev) => ({ ...prev, [photo.url]: "portrait" }));
      };
      img.src = getSafeImageUrl(photo.url);
    });
  }, [expandedMemory, photos]);

  // 每次打开新的 expandedMemory 时重置
  useEffect(() => {
    if (expandedMemory) {
      setCurrentIndex(initialIndex);
      setHasEntered(false);
      // 延迟触发入场动画，让初始状态先渲染
      requestAnimationFrame(() => setHasEntered(true));
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

  // 点击某张卡片 → 将其置中
  const focusCard = useCallback((index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
  }, [currentIndex]);

  const hasMultiple = photos.length > 1;

  // 键盘操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedMemory(null);
        return;
      }
      if (!hasMultiple) return;
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, photos.length, setExpandedMemory]);

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
        if (diff > 0) {
          setCurrentIndex((prev) => (prev + 1) % photos.length);
        } else {
          setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
        }
      }
    },
    [hasMultiple, photos.length]
  );

  // ====== early return 必须在所有 hooks 之后 ======
  if (!expandedMemory || photos.length === 0) return null;

  const { pin } = expandedMemory;
  const currentPhoto = photos[currentIndex];
  const takenDate = formatDate(currentPhoto?.takenAt);

  const springConfig = prefersReducedMotion
    ? { type: "tween" as const, duration: 0.25 }
    : { type: "spring" as const, stiffness: 120, damping: 22, mass: 0.8 };

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />

      {/* ====== 主体容器 ====== */}
      <div
        className="relative pointer-events-auto flex flex-col items-center w-full max-w-[96vw] max-h-[96vh]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        {/* ====== Polaroid 散落区 ====== */}
        <div className="relative w-full h-[620px] sm:h-[760px]">
          {photos.map((photo, index) => {
            const layout = getCardLayout(index, currentIndex, photos.length);
            const isFocused = index === currentIndex;
            const orientation = photoOrientations[photo.url] || "portrait";
            const config = CARD_CONFIG[orientation];
            const cardWidth = isFocused ? config.width : 260;
            const cardImageAspect = isFocused ? config.imageAspect : "1/1";

            return (
              <motion.div
                key={photo.url}
                className="absolute cursor-pointer select-none"
                style={{
                  left: "50%",
                  top: "50%",
                  width: 0,
                  height: 0,
                }}
                initial={{
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                  opacity: 0,
                  zIndex: layout.zIndex,
                }}
                animate={
                  hasEntered
                    ? {
                        x: layout.x,
                        y: layout.y,
                        rotate: layout.rotate,
                        scale: layout.scale,
                        opacity: layout.opacity,
                        zIndex: layout.zIndex,
                      }
                    : {}
                }
                transition={springConfig}
                onClick={(e) => {
                  e.stopPropagation();
                  focusCard(index);
                }}
              >
                {/* 居中偏移层 — 让卡片以其中心点对齐 motion 锚点 */}
                <div
                  className="flex flex-col bg-[#fafaf5]"
                  style={{
                    width: cardWidth,
                    transform: "translate(-50%, -50%)",
                    padding: "16px 16px 52px 16px",
                    boxShadow: isFocused
                      ? "5px 10px 32px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)"
                      : "2px 4px 14px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* 照片 */}
                  <div className="overflow-hidden bg-gray-100">
                    <img
                      src={getSafeImageUrl(photo.url)}
                      alt={photo.title || pin.name}
                      className="block w-full object-cover"
                      style={{ aspectRatio: cardImageAspect }}
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23e5e5e5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* Polaroid 底部留白区 */}
                  <div className="mt-2 text-center">
                    {photo.title ? (
                      <p
                        className="text-gray-500 font-medium leading-tight"
                        style={{ fontSize: isFocused ? 16 : 12 }}
                      >
                        {photo.title.length > 14
                          ? photo.title.slice(0, 14) + "..."
                          : photo.title}
                      </p>
                    ) : takenDate ? (
                      <p
                        className="text-gray-400 leading-tight"
                        style={{ fontSize: isFocused ? 15 : 11 }}
                      >
                        {takenDate}
                      </p>
                    ) : (
                      <p
                        className="text-gray-300 italic leading-tight"
                        style={{ fontSize: isFocused ? 15 : 11 }}
                      >
                        memory
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ====== 圆点指示器 ====== */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => focusCard(i)}
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
        <div className="w-full max-w-[500px] mt-3 px-1 space-y-2">
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

          {!takenDate && !currentPhoto?.title && !currentPhoto?.description && (
            <p className="text-white/20 text-xs text-center pt-1">
              点击空白处或按 Esc 关闭 · 点击照片切换
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
