"use client";

import { useState, useRef } from "react";
import { ImageIcon, Upload, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";

/** 允许上传的 MIME 类型 */
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/** 文件大小上限：10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface PhotoEntry {
  url: string;
  title: string;
  isPublic: boolean;
}

interface PhotoUploaderProps {
  photos: PhotoEntry[];
  onPhotosChange: (photos: PhotoEntry[]) => void;
}

export function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePickedRef = useRef(false);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const uploadingIndexRef = useRef<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);

  const setUploading = (index: number | null) => {
    uploadingIndexRef.current = index;
    setUploadingIndex(index);
  };

  /** 点击「选择文件」按钮，触发对应行的文件选择 */
  const handleSelectFile = (index: number) => {
    setUploadError(null);
    setErrorIndex(null);
    setUploading(index);
    filePickedRef.current = false;
    fileInputRef.current?.click();
    // 兜底：如果 10 秒内 onChange 没触发（用户取消），重置状态
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    cancelTimerRef.current = setTimeout(() => {
      if (!filePickedRef.current) setUploading(null);
    }, 10_000);
  };

  /** 文件选中后：验证 → 获取上传凭证 → 直传七牛云 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    filePickedRef.current = true;
    const file = e.target.files?.[0];
    // 重置 file input，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file || uploadingIndexRef.current === null) return;

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("不支持的文件类型，仅允许 JPG、PNG");
      setErrorIndex(uploadingIndexRef.current);
      setUploading(null);
      return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 10MB`);
      setErrorIndex(uploadingIndexRef.current);
      setUploading(null);
      return;
    }

    setUploadError(null);

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
        const errText = await uploadRes.text();
        console.error("七牛云上传失败:", uploadRes.status, errText);
        throw new Error(`上传失败: ${errText}`);
      }

      const uploadResult = await uploadRes.json();
      // 七牛云返回 { hash, key }，key 即对象路径
      if (!uploadResult.key) {
        throw new Error("上传响应异常");
      }

      // 3. 填入 URL
      const targetIndex = uploadingIndexRef.current!;
      onPhotosChange(
        photos.map((p, idx) =>
          idx === targetIndex ? { ...p, url: publicUrl } : p
        )
      );
    } catch (err: any) {
      setUploadError(err.message || "上传失败，请重试");
      setErrorIndex(uploadingIndexRef.current);
      setUploading(null);
    }
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
        <ImageIcon className="w-3.5 h-3.5" />
        照片
        <span className="text-white/20">
          ({photos.filter((p) => p.url.trim()).length} 张)
        </span>
      </label>

      {/* 隐藏的通用文件 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-2">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg p-2"
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
                    onPhotosChange(next);
                  }}
                  placeholder={
                    photo.url
                      ? photo.url
                      : `或粘贴图片 URL — 支持任意图床链接`
                  }
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20 px-1 py-0.5 min-w-0"
                />
              </div>
              {/* 标题 */}
              <input
                type="text"
                value={photo.title}
                onChange={(e) => {
                  const next = [...photos];
                  next[i] = { ...next[i], title: e.target.value };
                  onPhotosChange(next);
                }}
                placeholder="照片标题（可选）"
                className="w-full bg-transparent border-none outline-none text-white/60 text-xs placeholder:text-white/15 px-1 py-0.5"
              />
              {/* 上传错误提示 */}
              {uploadError && errorIndex === i && (
                <p className="text-xs text-red-400 px-1">{uploadError}</p>
              )}
              {/* URL 已填入提示 */}
              {photo.url && uploadingIndex !== i && (
                <p className="text-[10px] text-green-400/60 px-1 truncate">
                  已就绪: {photo.url.split("/").pop()}
                </p>
              )}
            </div>
            {/* 单张照片公开/私有 */}
            <button
              type="button"
              onClick={() => {
                const next = [...photos];
                next[i] = { ...next[i], isPublic: !next[i].isPublic };
                onPhotosChange(next);
              }}
              className={`p-1.5 rounded transition-colors shrink-0 mt-0.5 ${
                photo.isPublic
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-white/30 hover:text-white/50"
              }`}
              title={photo.isPublic ? "公开照片" : "私密照片"}
            >
              {photo.isPublic ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onPhotosChange(photos.filter((_, idx) => idx !== i))
                }
                className="p-1.5 text-white/30 hover:text-red-400 transition-colors shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          onPhotosChange([...photos, { url: "", title: "", isPublic: true }])
        }
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/15 text-white/30 hover:text-blue-400 hover:border-blue-400/30 transition-colors text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        添加更多照片
      </button>

      {/* 构图建议 */}
      {photos.filter((p) => p.url.trim()).length > 0 && (
        <p className="mt-1.5 text-[10px] text-white/15 text-center leading-relaxed">
          💡 建议上传横构图 (16:9) 和竖构图 (4:5) 两种比例的照片，获得最佳展示效果
        </p>
      )}
    </div>
  );
}
