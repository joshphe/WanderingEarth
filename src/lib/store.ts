import { create } from "zustand";
import type { GlobePin, PhotoMeta } from "@/lib/types";

export interface ExpandedMemory {
  pin: GlobePin;
  photo: PhotoMeta;
}

interface EarthStore {
  // 左侧菜单栏
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // 所有地点 (用于地球 Pin 显示)
  pins: GlobePin[];
  setPins: (pins: GlobePin[]) => void;
  addPin: (pin: GlobePin) => void;

  // 相机飞行目标
  flyToTarget: { lat: number; lng: number; id?: string } | null;
  setFlyToTarget: (target: { lat: number; lng: number; id?: string } | null) => void;

  // 地球自转暂停（鼠标悬浮照片时）
  earthPaused: boolean;
  setEarthPaused: (paused: boolean) => void;

  // 展开的记忆卡片（null = 收起状态）
  expandedMemory: ExpandedMemory | null;
  setExpandedMemory: (mem: ExpandedMemory | null) => void;

  // 等待飞行结束后展开的记忆
  pendingExpandedMemory: ExpandedMemory | null;
  setPendingExpandedMemory: (mem: ExpandedMemory | null) => void;

  // 地球当前 Y 轴旋转角（用于飞行目标的世界坐标换算）
  earthRotation: number;
  setEarthRotation: (r: number) => void;

  // 探索模式：正在查看的社区用户（null = 查看自己）
  exploreUserId: string | null;
  exploreUserName: string | null;
  setExploreMode: (userId: string | null, userName: string | null) => void;
}

export const useEarthStore = create<EarthStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  pins: [],
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((s) => ({ pins: [...s.pins, pin] })),

  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target }),

  earthPaused: false,
  setEarthPaused: (paused) => set({ earthPaused: paused }),

  expandedMemory: null,
  setExpandedMemory: (mem) => set({ expandedMemory: mem }),

  pendingExpandedMemory: null,
  setPendingExpandedMemory: (mem) => set({ pendingExpandedMemory: mem }),

  earthRotation: 0,
  setEarthRotation: (r) => set({ earthRotation: r }),

  exploreUserId: null,
  exploreUserName: null,
  setExploreMode: (userId, userName) => set({ exploreUserId: userId, exploreUserName: userName }),
}));
