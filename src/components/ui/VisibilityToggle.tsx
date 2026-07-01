"use client";

import { EyeOff } from "lucide-react";

interface VisibilityToggleProps {
  isPublic: boolean;
  onToggle: () => void;
  /** When true, shows warning that at least one photo must be public */
  showNoPublicPhotoWarning?: boolean;
}

export function VisibilityToggle({
  isPublic,
  onToggle,
  showNoPublicPhotoWarning = false,
}: VisibilityToggleProps) {
  return (
    <div className="space-y-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left"
      >
        <div
          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
            isPublic ? "bg-blue-500" : "bg-white/20"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              isPublic ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
        <div>
          <p className="text-sm text-white/80">
            {isPublic ? "本次记忆公开" : "本次记忆私密"}
          </p>
          <p className="text-xs text-white/40">
            {isPublic ? "其他用户可以在社区中看到本记忆" : "仅自己可见"}
          </p>
        </div>
      </button>

      {showNoPublicPhotoWarning && isPublic && (
        <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
          <EyeOff className="w-3 h-3" />
          请至少将一张照片设为公开，否则本次记忆将自动保存为私密
        </p>
      )}
    </div>
  );
}
