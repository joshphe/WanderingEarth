"use client";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md";
}

export function LoadingState({ message = "加载中...", size = "md" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <Loader2 className={`text-white/25 animate-spin ${size === "sm" ? "w-4 h-4" : "w-6 h-6"}`} />
      <p className="text-xs text-white/25">{message}</p>
    </div>
  );
}
