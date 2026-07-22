"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { X, MapPin, Calendar, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { PolaroidStack } from "@/components/ui/PolaroidStack";
import { CommentPanel } from "@/components/ui/CommentPanel";
import type { PhotoMeta } from "@/lib/types";
import type { FeedItem } from "./FeedCard";

interface MemoryModalProps {
  item: FeedItem | null;
  isOwner: boolean;
  isAuthenticated?: boolean;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return null;
  }
}

export function MemoryModal({ item, isOwner, isAuthenticated = true, onClose }: MemoryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentPanelOpen, setCommentPanelOpen] = useState(true);

  // 每次打开新 item 时重置索引
  useEffect(() => {
    setCurrentIndex(0);
  }, [item?.id]);

  const photos: PhotoMeta[] = useMemo(() => {
    if (!item?.photos?.length) {
      return item?.coverUrl ? [{ url: item.coverUrl }] : [];
    }
    return item.photos.map((p) => ({
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
    }));
  }, [item]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // 键盘操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (photos.length <= 1) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, goPrev, goNext, onClose]);

  const touchStartX = useRef(0);

  if (!item) return null;

  const hasMultiple = photos.length > 1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;
  const currentPhoto = photos[currentIndex];
  const takenDate = formatDate(currentPhoto?.takenAt);

  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 glass border border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/10 active:scale-95";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative flex items-stretch w-full max-w-[96vw] h-[96vh] max-h-[96vh] overflow-hidden z-10">
        {photos.length > 0 ? (
          <>
            {/* 左侧：照片区 */}
            <div className="flex flex-col items-center flex-1 min-w-0 min-h-0 pt-4 pb-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* 顶部工具栏 */}
              <div className="w-full flex items-center justify-between px-2 mb-4 max-w-[700px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
                  <h2 className="text-white/85 text-sm font-semibold truncate">{item.name}</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {hasMultiple && (
                    <span className="text-white/35 text-xs tabular-nums tracking-wider">
                      {currentIndex + 1}<span className="text-white/12"> / </span>{photos.length}
                    </span>
                  )}
                  <button onClick={handleClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/45 hover:text-white/85 flex items-center justify-center transition-all border border-white/5 hover:border-white/15" aria-label="关闭">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 照片区 */}
              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center max-w-[800px]"
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  if (!hasMultiple) return;
                  const diff = touchStartX.current - e.changedTouches[0].clientX;
                  if (Math.abs(diff) > 60) { diff > 0 && !isLast ? goNext() : diff < 0 && !isFirst && goPrev(); }
                }}
              >
                {hasMultiple && !isFirst && (
                  <button onClick={goPrev} className={`${arrowBtn} left-2`} aria-label="上一张"><ChevronLeft className="w-5 h-5" /></button>
                )}
                <div className="w-full h-full flex items-center justify-center">
                  <PolaroidStack photos={photos} currentIndex={currentIndex} onSelect={setCurrentIndex} />
                </div>
                {hasMultiple && !isLast && (
                  <button onClick={goNext} className={`${arrowBtn} right-2`} aria-label="下一张"><ChevronRight className="w-5 h-5" /></button>
                )}
              </div>

              {/* 圆点指示器 */}
              {hasMultiple && (
                <div className="flex items-center justify-center gap-1.5 mt-3 shrink-0">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                      className={`rounded-full transition-all duration-300 ${i === currentIndex ? "bg-white/80 w-5 h-1.5" : "bg-white/25 hover:bg-white/45 w-1.5 h-1.5"}`}
                      aria-label={`第 ${i + 1} 张照片`} />
                  ))}
                </div>
              )}

              {/* 照片信息 */}
              <div className="w-full max-w-[500px] mt-3 px-1 space-y-2 shrink-0">
                {takenDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <p className="text-white/55 text-sm">{takenDate}</p>
                  </div>
                )}
                {currentPhoto?.title && (
                  <h3 className="text-white/90 text-base sm:text-lg font-semibold leading-snug">{currentPhoto.title}</h3>
                )}
                {currentPhoto?.description && (
                  <p className="text-white/45 text-sm leading-relaxed max-h-20 overflow-y-auto">{currentPhoto.description}</p>
                )}
              </div>
            </div>

            {/* 右侧：评论面板 */}
            {commentPanelOpen && (
              <CommentPanel locationId={item.id} isOwner={isOwner} isAuthenticated={isAuthenticated} onClose={() => setCommentPanelOpen(false)} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-sm">暂无照片</p>
          </div>
        )}

        {!commentPanelOpen && (
          <button onClick={() => setCommentPanelOpen(true)}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 glass rounded-full p-2.5 text-white/40 hover:text-white/70 transition-all border border-white/10 hover:border-white/20" title="打开评论">
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
