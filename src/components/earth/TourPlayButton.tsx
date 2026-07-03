"use client";

import { Play, Square } from "lucide-react";
import { useEarthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TourPlayButton() {
  const pins = useEarthStore((s) => s.pins);
  const tourPhase = useEarthStore((s) => s.tourPhase);
  const setTourPhase = useEarthStore((s) => s.setTourPhase);

  const disabled = pins.filter((p) => p.photoCount > 0).length < 2;
  const isActive = tourPhase !== "idle";
  const isPlaying = tourPhase === "flying";

  const handleClick = () => {
    if (isActive) {
      setTourPhase("idle");
    } else {
      setTourPhase("flying");
    }
  };

  const Icon = isActive ? Square : Play;
  const label = isPlaying
    ? "停止巡演"
    : isActive
      ? "清除轨迹"
      : disabled
        ? "至少需要 2 个地点"
        : "播放旅行巡演";

  return (
    <div className="fixed bottom-24 right-6 z-30">
      <button
        onClick={handleClick}
        disabled={disabled && !isActive}
        title={label}
        aria-label={label}
        className={cn(
          "glass rounded-full p-3 text-white/80 transition-all duration-200 shadow-lg",
          "border border-white/10",
          disabled && !isActive
            ? "opacity-30 cursor-not-allowed"
            : "hover:text-white hover:border-blue-400/40 hover:bg-blue-500/10"
        )}
      >
        <Icon size={20} className={cn(isActive && "text-blue-400")} />
      </button>

      {!disabled && !isActive && (
        <span className="absolute -top-7 right-0 text-white/35 text-xs whitespace-nowrap pointer-events-none">
          旅行巡演
        </span>
      )}
    </div>
  );
}
