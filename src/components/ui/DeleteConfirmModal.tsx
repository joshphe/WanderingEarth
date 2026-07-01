"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const API_MAP: Record<string, string> = {
  location: "/api/locations",
  photo: "/api/photos",
};

const LABEL_MAP: Record<string, string> = {
  location: "地点",
  photo: "照片",
};

export function DeleteConfirmModal({
  targetId,
  targetType,
  targetName,
  onDeleted,
  onClose,
}: {
  targetId: string;
  targetType: "location" | "photo";
  targetName: string;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  // Esc 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_MAP[targetType]}/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "删除失败");
      }
      toast.success(`已删除${LABEL_MAP[targetType]}`);
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || "删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            确认删除
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-white/70 text-sm">
            确认删除{LABEL_MAP[targetType]}「
            <span className="text-white font-medium">{targetName}</span>
            」？此操作不可撤销
            {targetType === "location" && "，该地点下的所有照片也将被删除"}
            。
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {deleting ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
