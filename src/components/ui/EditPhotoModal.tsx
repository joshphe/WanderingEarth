"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { PhotoItem } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

export function EditPhotoModal({
  photo,
  onUpdated,
  onClose,
}: {
  photo: PhotoItem;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(photo.title || "");
  const [description, setDescription] = useState(photo.description || "");
  const [takenAt, setTakenAt] = useState(
    photo.takenAt ? photo.takenAt.split("T")[0] : ""
  );
  const [isPublic, setIsPublic] = useState(photo.isPublic ?? true);
  const [saving, setSaving] = useState(false);

  // Esc 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          takenAt: takenAt || null,
          isPublic,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      toast.success("照片信息已更新");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-modal w-full max-w-sm max-h-[90vh] overflow-y-auto animate-modal-enter">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            编辑照片信息
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors group"
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 预览 */}
          <div className="rounded-lg overflow-hidden bg-white/[0.07] aspect-video">
            <img
              src={getSafeImageUrl(photo.url)}
              alt={photo.title || ""}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
              onLoad={(e) => {
                (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
              }}
            />
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-xs text-white/50 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="照片标题（可选）"
              className="w-full bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-blue-400/50 input-glow transition-colors"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs text-white/50 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="照片描述（可选）"
              rows={2}
              className="w-full bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-blue-400/50 input-glow transition-colors resize-none"
            />
          </div>

          {/* 拍摄日期 */}
          <div>
            <label className="block text-xs text-white/50 mb-1">拍摄日期</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 input-glow transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
            />
          </div>

          {/* 公开/私密切换 */}
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg text-left"
          >
            {isPublic ? (
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/40 shrink-0" />
            )}
            <div>
              <p className="text-sm text-white/80">
                {isPublic ? "公开照片" : "私密照片"}
              </p>
              <p className="text-xs text-white/40">
                {isPublic ? "其他用户可以在社区中看到" : "仅自己可见"}
              </p>
            </div>
          </button>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-transform active:scale-[0.97]"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
