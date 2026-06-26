"use client";

import { useState } from "react";
import { Pencil, Check, X, Mail, MapPin, Image, Globe } from "lucide-react";
import { toast } from "sonner";
import type { UserProp } from "@/lib/types";

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
  const [togglingCommunity, setTogglingCommunity] = useState(false);

  const handleToggleCommunity = async () => {
    setTogglingCommunity(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !user.isPublic }),
      });
      if (!res.ok) throw new Error("更新失败");
      const updated = await res.json();
      onUserUpdate({ isPublic: updated.isPublic });
      toast.success(updated.isPublic ? "已开放社区，其他用户可以随机访问你的记忆" : "已关闭社区，你的记忆仅自己可见");
    } catch {
      toast.error("更新失败，请重试");
    } finally {
      setTogglingCommunity(false);
    }
  };

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
                className="text-white/50 hover:text-blue-400 transition-colors p-1"
                title="编辑昵称"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-white/60">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user.email || "未知邮箱"}</span>
          </div>
        </div>
      </div>

      {/* 社区开放设置 */}
      <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
        <button
          onClick={handleToggleCommunity}
          disabled={togglingCommunity}
          className="w-full flex items-center gap-3 text-left"
        >
          <div
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
              user.isPublic ? "bg-blue-500" : "bg-white/20"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                user.isPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Globe className={`w-3.5 h-3.5 ${user.isPublic ? "text-blue-400" : "text-white/40"}`} />
              <p className="text-sm text-white/80">
                {user.isPublic ? "已开放社区" : "关闭社区"}
              </p>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {user.isPublic
                ? "其他用户可以通过「探索全球」随机访问你的公开旅行记忆"
                : "开启后，你设为公开的旅行记忆可被其他用户随机发现"}
            </p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.07] rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
            <MapPin className="w-3.5 h-3.5" />
            足迹地点
          </div>
          <p className="text-2xl font-bold text-white">{totalLocations}</p>
        </div>
        <div className="bg-white/[0.07] rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
            <Image className="w-3.5 h-3.5" />
            旅行照片
          </div>
          <p className="text-2xl font-bold text-white">{totalPhotos}</p>
        </div>
      </div>
    </div>
  );
}
