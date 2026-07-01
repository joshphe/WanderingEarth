"use client";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <AlertTriangle className="w-8 h-8 text-amber-400/40" />
      <p className="text-sm text-white/40">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white/80 border border-white/10 transition-colors">
          重试
        </button>
      )}
    </div>
  );
}
