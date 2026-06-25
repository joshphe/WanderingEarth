"use client";

import { useState } from "react";
import { Pencil, Check, X, Mail, MapPin, Image } from "lucide-react";
import { toast } from "sonner";

interface UserProp {
  id?: string;
  name?: string | null;
  email?: string | null;
}

export function ProfileHeader({
  user,
  onUserUpdate,
  totalLocations,
  totalPhotos,
}: {
  user: UserProp;
  onUserUpdate: (u: Partial<UserProp>) => void;
  totalLocations: number;
  totalPhotos: number;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("昵称不能为空");
      return;
    }
    if (trimmed === (user.name || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      const updated = await res.json();
      onUserUpdate({ name: updated.name });
      setName(updated.name);
      setEditing(false);
      toast.success("昵称已更新");
    } catch (e: any) {
      toast.error(e.message || "更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user.name || "");
    setEditing(false);
  };

  return (
    <div className="glass p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                className="bg-white/10 border border-blue-500/50 rounded-lg px-3 py-1.5 text-white text-xl font-bold w-full max-w-[240px] focus:outline-none focus:border-blue-400 transition-colors"
                autoFocus
                disabled={saving}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-green-400 hover:text-green-300 p-1 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-white/40 hover:text-white/60 p-1 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white truncate">
                {user.name || "旅行者"}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="text-white/30 hover:text-blue-400 transition-colors p-1"
                title="编辑昵称"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-white/40">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user.email || "未知邮箱"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
            <MapPin className="w-3.5 h-3.5" />
            足迹地点
          </div>
          <p className="text-2xl font-bold text-white">{totalLocations}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
            <Image className="w-3.5 h-3.5" />
            旅行照片
          </div>
          <p className="text-2xl font-bold text-white">{totalPhotos}</p>
        </div>
      </div>
    </div>
  );
}
