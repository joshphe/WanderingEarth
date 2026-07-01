"use client";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon className="w-10 h-10 text-white/15 mb-3" />}
      <p className="text-sm text-white/30">{message}</p>
      {action && onAction && (
        <button onClick={onAction}
          className="mt-3 text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}
