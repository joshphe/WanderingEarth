"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Compass,
  User,
} from "lucide-react";
import { useEarthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddMemoryModal } from "./AddMemoryModal";

export function LeftSidebar({ user }: { user?: { name?: string | null } | null }) {
  const sidebarOpen = useEarthStore((s) => s.sidebarOpen);
  const toggleSidebar = useEarthStore((s) => s.toggleSidebar);
  const pins = useEarthStore((s) => s.pins);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);

  const [showAddMemory, setShowAddMemory] = useState(false);

  return (
    <>
      {/* 折叠按钮 */}
      <button
        onClick={toggleSidebar}
        className="absolute top-24 left-4 z-30 glass rounded-full p-2 text-white/60 hover:text-white transition-colors"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      {/* 侧边栏 */}
      <div
        className={cn(
          "absolute top-20 left-4 z-20 transition-all duration-300",
          sidebarOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 pointer-events-none"
        )}
      >
        <div className="glass overflow-hidden flex flex-col w-52">
          {/* 头部 */}
          <div className="p-3 border-b border-white/10">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              流浪地球
            </h2>
          </div>

          {/* 功能列表 */}
          <div className="p-2 space-y-1">
            {/* 添加旅行记忆 */}
            <button
              onClick={() => setShowAddMemory(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              添加旅行记忆
            </button>

            {/* 我的足迹 — 随机定位到一条记忆 */}
            <button
              onClick={() => {
                const withPhotos = pins.filter((p) => p.photoCount > 0);
                if (withPhotos.length === 0) return;
                const pick = withPhotos[Math.floor(Math.random() * withPhotos.length)];
                setFlyToTarget({ lat: pick.lat, lng: pick.lng, id: pick.id });
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              我的足迹
              {pins.length > 0 && (
                <span className="ml-auto text-xs text-white/20">{pins.length}</span>
              )}
            </button>

            {/* 探索全球 */}
            <button
              onClick={() => {
                const first = pins[0];
                if (first) setFlyToTarget({ lat: first.lat, lng: first.lng });
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all"
            >
              <Compass className="w-4 h-4" />
              探索全球
            </button>

            {/* 个人中心 */}
            {user ? (
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all"
              >
                <User className="w-4 h-4" />
                {user.name || "旅行者"}
              </button>
            ) : (
              <a
                href="/signin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all no-underline"
              >
                <User className="w-4 h-4" />
                登录
              </a>
            )}
          </div>

          {/* 底部统计 */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/30">
              <span>总足迹</span>
              <span>{pins.length} 个地点</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/30 mt-1">
              <span>照片</span>
              <span>{pins.reduce((sum, p) => sum + p.photoCount, 0)} 张</span>
            </div>
          </div>
        </div>
      </div>

      {/* 添加旅行记忆弹窗 */}
      {showAddMemory && (
        <AddMemoryModal onClose={() => setShowAddMemory(false)} />
      )}
    </>
  );
}
