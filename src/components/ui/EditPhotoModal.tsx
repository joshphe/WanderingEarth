"use client";

import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

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
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            编辑照片信息
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 预览 */}
          <div className="rounded-lg overflow-hidden bg-white/5 aspect-video">
            <img
              src={photo.url}
              alt={photo.title || ""}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="照片标题（可选）"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="照片描述（可选）"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors resize-none"
            />
          </div>

          {/* 拍摄日期 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">拍摄日期</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
            />
          </div>

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
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
