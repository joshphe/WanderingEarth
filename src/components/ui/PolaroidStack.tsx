"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import NextImage from "next/image";
import { getSafeImageUrl } from "@/lib/utils";

// Seeded pseudo-random number generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

interface ScatterPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface PolaroidStackProps {
  photos: { url: string; title?: string | null }[];
  currentIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0, staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: (custom: { zIndex: number }) => ({
    x: 0, y: 0, rotate: 0, scale: 1, opacity: 0, zIndex: custom.zIndex,
  }),
  visible: (custom: {
    position: ScatterPosition;
    zIndex: number;
    springConfig: any;
  }) => ({
    x: custom.position.x,
    y: custom.position.y,
    rotate: custom.position.rotation,
    scale: custom.position.scale,
    opacity: 1,
    zIndex: custom.zIndex,
    transition: custom.springConfig,
  }),
};

export function PolaroidStack({
  photos,
  currentIndex,
  onSelect,
  className = "",
}: PolaroidStackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Generate scatter positions for non-focused photos (fan to the left)
  const scatterPositions = React.useMemo(() => {
    const rng = new SeededRandom(42);
    const sidePhotos = photos.filter((_, i) => i !== currentIndex);

    // Map side photo indices to consistent positions
    return photos.map((_, index) => {
      if (index === currentIndex) return null;

      // Find position of this side photo in the side photos list
      const sideIndex = sidePhotos.findIndex(
        (sp) => sp.url === photos[index].url
      );
      const totalSide = sidePhotos.length || 1;

      // Fan out to the left, staggered vertically
      const x = rng.range(-320, -180) - (sideIndex / totalSide) * 60;
      const y = rng.range(-180, 180);
      const rotation = rng.range(-12, 12);
      const scale = rng.range(0.75, 0.88);

      return { x, y, rotation, scale };
    });
  }, [photos, currentIndex]);

  // Trigger animation
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const springConfig = prefersReducedMotion
    ? { type: "tween" as const, duration: 0.25 }
    : { type: "spring" as const, stiffness: 100, damping: 20 };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
    >
      <motion.div
        className="relative w-full h-full"
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
      >
        {photos.map((photo, index) => {
          const isFocused = index === currentIndex;
          const position = scatterPositions[index];

          // Focused photo: center, large, on top
          const focusedStyle = {
            position: "absolute" as const,
            left: "50%",
            top: "50%",
            marginLeft: -170,
            marginTop: -225,
            zIndex: photos.length + 1,
          };

          // Side photo with scatter position
          const sideStyle = position
            ? {
                position: "absolute" as const,
                left: "50%",
                top: "50%",
                marginLeft: -140,
                marginTop: -195,
                zIndex: isFocused ? photos.length + 1 : photos.length - index,
              }
            : { display: "none" as const };

          if (isFocused) {
            // ── Center focused photo ──
            return (
              <motion.div
                key={`${photo.url}-${index}`}
                style={focusedStyle}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
                className="pointer-events-none"
              >
                <div className="bg-[#fafaf7] p-4 shadow-2xl border border-white/20 rounded-sm">
                  <NextImage
                    src={getSafeImageUrl(photo.url)}
                    unoptimized
                    alt={photo.title || ""}
                    width={340}
                    height={408}
                    className="w-80 h-96 object-cover rounded-sm"
                    draggable={false}
                    priority
                  />
                  <div className="mt-3 text-sm text-gray-500 text-center font-medium min-h-[1.25rem]">
                    {photo.title || ""}
                  </div>
                </div>
              </motion.div>
            );
          }

          if (!position) return null;

          // ── Side scattered photo ──
          return (
            <motion.div
              key={`${photo.url}-${index}`}
              className="absolute cursor-pointer"
              variants={cardVariants}
              custom={{
                position,
                zIndex: photos.length - index,
                springConfig,
              }}
              style={sideStyle}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index);
              }}
            >
              <div className="bg-[#fafaf7] p-3 shadow-lg border border-white/10 rounded-sm hover:shadow-xl hover:border-blue-200/50 transition-shadow duration-200">
                <NextImage
                  src={getSafeImageUrl(photo.url)}
                  unoptimized
                  alt={photo.title || ""}
                  width={280}
                  height={336}
                  className="w-64 h-80 object-cover rounded-sm"
                  draggable={false}
                />
                <div className="mt-2 text-xs text-gray-400 text-center truncate max-w-[240px]">
                  {photo.title || ""}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
