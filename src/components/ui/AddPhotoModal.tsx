"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Image as ImageIcon, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** 允许上传的 MIME 类型 */
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

/** 文件大小上限：10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  // 上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  /** 点击「选择文件」按钮 */
  const handleSelectFile = (index: number) => {
    setUploadingIndex(index);
    fileInputRef.current?.click();
  };

  /** 文件选中后：验证 → 获取凭证 → 直传七牛云 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file || uploadingIndex === null) return;

    // 验证类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("不支持的文件类型，仅允许 JPEG、PNG、WebP、AVIF、HEIC");
      setUploadingIndex(null);
      return;
    }

    // 验证大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 10MB`);
      setUploadingIndex(null);
      return;
    }

    try {
      // 1. 获取上传凭证
      const presignRes = await fetch(
        `/api/photos/presign?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
      );
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "获取上传凭证失败");
      }

      const { uploadToken, uploadUrl, key, publicUrl } = await presignRes.json();

      // 2. 直传七牛云
      const formData = new FormData();
      formData.append("token", uploadToken);
      formData.append("key", key);
      formData.append("file", file);

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("上传失败");
      }

      const uploadResult = await uploadRes.json();
      if (!uploadResult.key) {
        throw new Error("上传响应异常");
      }

      // 3. 填入 URL
      const targetIndex = uploadingIndex;
      setPhotos((prev) => {
        const next = [...prev];
        next[targetIndex] = { ...next[targetIndex], url: publicUrl };
        return next;
      });
      toast.success("上传成功");
    } catch (err: any) {
      toast.error(err.message || "上传失败，请重试");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAdd = async () => {
    const validPhotos = photos.filter((p) => p.url.trim());
    if (validPhotos.length === 0) {
      toast.error("请至少填写一张照片链接");
      return;
    }

    setSaving(true);
    try {
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
          {/* 隐藏的通用文件 input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
          />

          {photos.map((photo, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-white/[0.07] border border-white/10 rounded-lg p-2"
            >
              <div className="flex-1 space-y-2">
                {/* 上传按钮 + URL 输入 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectFile(i)}
                    disabled={uploadingIndex === i}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
                  >
                    {uploadingIndex === i ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploadingIndex === i ? "上传中..." : "选择文件"}
                  </button>
                  <input
                    type="url"
                    value={photo.url}
                    onChange={(e) => {
                      const next = [...photos];
                      next[i] = { ...next[i], url: e.target.value };
                      setPhotos(next);
                    }}
                    placeholder={photo.url ? photo.url : "或粘贴图片 URL"}
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/35 px-1 py-0.5 min-w-0"
                  />
                </div>
                {/* 标题 */}
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
                {/* URL 已填入提示 */}
                {photo.url && uploadingIndex !== i && (
                  <p className="text-[10px] text-green-400/60 px-1 truncate">
                    已就绪: {photo.url.split("/").pop()}
                  </p>
                )}
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
