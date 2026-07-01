"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useEarthStore } from "@/lib/store";
import { LoadingState } from "./LoadingState";
import { cn } from "@/lib/utils";

const AddMemoryModal = dynamic(
  () => import("./AddMemoryModal").then((m) => ({ default: m.AddMemoryModal })),
  { ssr: false }
);

export function LeftSidebar({ user }: { user?: { name?: string | null } | null }) {
  const sidebarOpen = useEarthStore((s) => s.sidebarOpen);
  const toggleSidebar = useEarthStore((s) => s.toggleSidebar);
  const pins = useEarthStore((s) => s.pins);
  const setPins = useEarthStore((s) => s.setPins);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const exploreUserId = useEarthStore((s) => s.exploreUserId);
  const exploreUserName = useEarthStore((s) => s.exploreUserName);
  const setExploreMode = useEarthStore((s) => s.setExploreMode);
  const dataLoading = useEarthStore((s) => s.dataLoading);

  const prefersReduced = useReducedMotion();

  const [showAddMemory, setShowAddMemory] = useState(false);

  const isExploring = !!exploreUserId;

  return (
    <>
      {/* 折叠按钮 — 随菜单开合移动，不遮挡菜单 */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute top-24 z-30 glass rounded-full p-2 text-white/60 hover:text-white transition-all duration-300",
          sidebarOpen ? "left-[15.5rem]" : "left-4"
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      {/* 侧边栏 */}
      <motion.div
        initial={prefersReduced ? {} : { x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
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
            {isExploring ? (
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-green-400" />
                  正在探索
                  <span className="relative flex h-2 w-2 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                </h2>
                <p className="text-xs text-white/50 mt-0.5 truncate">
                  {exploreUserName || "未知用户"}
                </p>
                {exploreUserId && (
                  <p className="text-[10px] text-white/25 mt-0.5 truncate font-mono">
                    ID: {exploreUserId}
                  </p>
                )}
              </div>
            ) : (
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                流浪地球
              </h2>
            )}
          </div>

          {/* 功能列表 */}
          <div className="p-2 space-y-1">
            {/* 添加旅行记忆 — 探索模式下隐藏 */}
            {!isExploring && (
              <button
                onClick={() => setShowAddMemory(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-medium transition-all animate-pulse-glow"
              >
                <Plus className="w-4 h-4" />
                添加旅行记忆
              </button>
            )}

            {/* 返回我的足迹 — 探索模式下显示 */}
            {isExploring && (
              <button
                onClick={() => {
                  setExploreMode(null, null);
                  setPins([]); // 触发 DataLoader 重新加载
                  toast.success("已返回我的地球");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                返回我的足迹
              </button>
            )}

            {/* 探索全球 — 随机访问一个开放社区用户的公开记忆 */}
            <button
              onClick={async () => {
                try {
                  const url = exploreUserId
                    ? `/api/explore?exclude=${exploreUserId}`
                    : "/api/explore";
                  const res = await fetch(url);
                  const data = await res.json();
                  if (data.empty) {
                    toast.info(data.message || "暂无公开记忆");
                    return;
                  }
                  // 将 pins 替换为该用户的公开记忆
                  const explorePins = data.locations.map((loc: any) => ({
                    id: loc.id,
                    lat: loc.latitude,
                    lng: loc.longitude,
                    name: loc.name,
                    photoCount: loc.photoCount || 0,
                    coverUrl: loc.coverUrl || undefined,
                    photoUrls: loc.photoUrls || [],
                    photos: loc.photos || [],
                  }));
                  setPins(explorePins);
                  setExploreMode(data.user.id, data.user.name || "未知用户");
                  // 飞到第一个地点
                  if (explorePins.length > 0) {
                    setFlyToTarget({
                      lat: explorePins[0].lat,
                      lng: explorePins[0].lng,
                      id: explorePins[0].id,
                    });
                  }
                  toast.success(
                    `探索到 ${data.user?.name || "未知用户"} 的记忆（${explorePins.length} 个地点）`
                  );
                } catch {
                  toast.error("网络错误，请重试");
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-sm transition-all ${
                isExploring
                  ? "text-green-400/80 hover:text-green-300"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4" />
              {isExploring ? "换个用户探索" : "探索全球"}
            </button>

          </div>

          {/* 底部统计 */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/30">
              <span>{isExploring ? "TA的足迹" : "总足迹"}</span>
              <span>{pins.length} 个地点</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/30 mt-1">
              <span>照片</span>
              <span>{pins.reduce((sum, p) => sum + p.photoCount, 0)} 张</span>
            </div>
            {dataLoading && (
              <div className="mt-2 border-t border-white/5 pt-2">
                <LoadingState size="sm" message="同步中..." />
              </div>
            )}
          </div>
        </div>
      </motion.div>
      {showAddMemory && (
        <AddMemoryModal onClose={() => setShowAddMemory(false)} />
      )}
    </>
  );
}
