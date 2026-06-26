"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AddPhotoModal({
  locationId,
  locationName,
  onAdded,
  onClose,
}: {
  locationId: string;
  locationName: string;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<{ url: string; title: string }[]>([
    { url: "", title: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const validPhotos = photos.filter((p) => p.url.trim());
    if (validPhotos.length === 0) {
      toast.error("请至少填写一张照片链接");
      return;
    }

    setSaving(true);
    try {
      // 逐张创建照片
      for (const p of validPhotos) {
        const res = await fetch(`/api/locations/${locationId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: p.url.trim(),
            title: p.title.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "添加失败");
        }
      }

      toast.success(`已添加 ${validPhotos.length} 张照片`);
      onAdded();
    } catch (e: any) {
      toast.error(e.message || "添加失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            添加照片到 {locationName}
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-white/[0.07] border border-white/10 rounded-lg p-2"
            >
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={photo.url}
                  onChange={(e) => {
                    const next = [...photos];
                    next[i] = { ...next[i], url: e.target.value };
                    setPhotos(next);
                  }}
                  placeholder={`照片 ${i + 1} — OSS 图片链接`}
                  className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/35 px-1 py-0.5"
                />
                <input
                  type="text"
                  value={photo.title}
                  onChange={(e) => {
                    const next = [...photos];
                    next[i] = { ...next[i], title: e.target.value };
                    setPhotos(next);
                  }}
                  placeholder="照片标题（可选）"
                  className="w-full bg-transparent border-none outline-none text-white/70 text-xs placeholder:text-white/30 px-1 py-0.5"
                />
              </div>
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="p-1.5 text-white/50 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setPhotos((prev) => [...prev, { url: "", title: "" }])
            }
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-blue-400 hover:border-blue-400/40 transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            添加更多照片
          </button>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={
                saving || !photos.some((p) => p.url.trim())
              }
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "添加中..." : "添加"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
