"use client";

import React, { useState, useEffect, useMemo } from "react";
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

// ── Orientation-aware card sizing ──

type Orientation = "landscape" | "portrait";

/** Focused & side card dimensions per orientation */
const CARD_CONFIG = {
  landscape: {
    focused: {
      imageW: 640,       // px
      imageH: 380,       // px
      padding: 24,       // px (p-6)
      bottomPad: 56,     // Polaroid bottom strip
      marginLeft: -344,  // half card width + half padding
      marginTop: -230,   // half image height + padding + half bottom
    },
    side: {
      imageW: 288,
      imageH: 176,
      padding: 12,
      bottomPad: 36,
    },
  },
  portrait: {
    focused: {
      imageW: 400,
      imageH: 500,
      padding: 20,
      bottomPad: 52,
      marginLeft: -220,
      marginTop: -286,
    },
    side: {
      imageW: 224,
      imageH: 280,
      padding: 12,
      bottomPad: 32,
    },
  },
} as const;

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

/** Detect orientation from loaded image */
function detectOrientation(img: HTMLImageElement): Orientation {
  return img.naturalWidth / img.naturalHeight > 1.1 ? "landscape" : "portrait";
}

export function PolaroidStack({
  photos,
  currentIndex,
  onSelect,
  className = "",
}: PolaroidStackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [orientations, setOrientations] = useState<Record<string, Orientation>>({});
  const prefersReducedMotion = useReducedMotion();

  // Preload images and detect orientations
  useEffect(() => {
    const detected: Record<string, Orientation> = {};
    let cancelled = false;

    Promise.all(
      photos.map((photo) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) detected[photo.url] = detectOrientation(img);
            resolve();
          };
          img.onerror = () => {
            if (!cancelled) detected[photo.url] = "portrait"; // default
            resolve();
          };
          img.src = getSafeImageUrl(photo.url);
        });
      })
    ).then(() => {
      if (!cancelled) setOrientations(detected);
    });

    return () => { cancelled = true; };
  }, [photos]);

  // Get orientation for a photo (default portrait until detected)
  const getOrientation = (url: string): Orientation =>
    orientations[url] || "portrait";

  // Generate scatter positions — bottom-to-top by photo order, behind the focused card
  const scatterPositions = useMemo(() => {
    const maxIndex = Math.max(photos.length - 1, 1);

    return photos.map((_, index) => {
      if (index === currentIndex) return null;

      // Deterministic seed per photo index
      const rng = new SeededRandom(index * 73 + 42);
      // Normalize: 0 = first photo (bottom), 1 = last photo (top)
      const norm = index / maxIndex;

      // Vertical spread: bottom → top by photo order
      const y = (norm - 0.5) * 340;

      // Horizontal: fan slightly left, behind center
      const x = rng.range(-140, -40) + (norm - 0.5) * 30;

      // Subtle rotation
      const rotation = rng.range(-8, 8);

      // Later photos slightly larger (higher in stack)
      const scale = 0.68 + norm * 0.08;

      return { x, y, rotation, scale };
    });
  }, [photos, currentIndex]);

  // Trigger animation on index change
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const springConfig = prefersReducedMotion
    ? { type: "tween" as const, duration: 0.25 }
    : { type: "spring" as const, stiffness: 100, damping: 20 };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <motion.div
        className="relative w-full h-full"
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
      >
        {photos.map((photo, index) => {
          const isFocused = index === currentIndex;
          const position = scatterPositions[index];
          const orientation = getOrientation(photo.url);

          if (isFocused) {
            // ── Focused photo (center, large) ──
            const cfg = CARD_CONFIG[orientation].focused;
            const cardW = cfg.imageW + cfg.padding * 2;

            return (
              <motion.div
                key={`${photo.url}-${index}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  marginLeft: cfg.marginLeft,
                  marginTop: cfg.marginTop,
                  zIndex: photos.length + 1,
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
                className="pointer-events-none"
              >
                <div
                  className="bg-[#fafaf7] shadow-2xl border border-white/15 rounded-sm"
                  style={{ padding: cfg.padding }}
                >
                  <NextImage
                    src={getSafeImageUrl(photo.url)}
                    unoptimized
                    alt={photo.title || ""}
                    width={cfg.imageW}
                    height={cfg.imageH}
                    className="rounded-sm object-cover"
                    style={{ width: cfg.imageW, height: cfg.imageH }}
                    draggable={false}
                    priority
                  />
                  <div
                    className="text-center font-medium text-gray-500"
                    style={{
                      paddingTop: 12,
                      fontSize: 14,
                      minHeight: 20,
                      width: cfg.imageW,
                    }}
                  >
                    {photo.title || ""}
                  </div>
                </div>
              </motion.div>
            );
          }

          if (!position) return null;

          // ── Side scattered photo ──
          const sideCfg = CARD_CONFIG[orientation].side;

          return (
            <motion.div
              key={`${photo.url}-${index}`}
              className="absolute cursor-pointer"
              variants={cardVariants}
              custom={{ position, zIndex: index + 1, springConfig }}
              style={{
                left: "50%",
                top: "50%",
                marginLeft: -(sideCfg.imageW + sideCfg.padding * 2) / 2,
                marginTop: -(sideCfg.imageH + sideCfg.padding * 2 + sideCfg.bottomPad) / 2,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index);
              }}
            >
              <div
                className="bg-[#fafaf7] shadow-lg border border-white/10 rounded-sm
                  hover:shadow-xl hover:border-blue-200/50 transition-shadow duration-200"
                style={{ padding: sideCfg.padding }}
              >
                <NextImage
                  src={getSafeImageUrl(photo.url)}
                  unoptimized
                  alt={photo.title || ""}
                  width={sideCfg.imageW}
                  height={sideCfg.imageH}
                  className="rounded-sm object-cover"
                  style={{ width: sideCfg.imageW, height: sideCfg.imageH }}
                  draggable={false}
                />
                <div
                  className="text-center text-gray-400 truncate"
                  style={{
                    paddingTop: 8,
                    fontSize: 11,
                    width: sideCfg.imageW,
                  }}
                >
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
