import { auth } from "@/lib/auth";
import { EarthScene } from "@/components/earth/EarthScene";
import { Navbar } from "@/components/ui/Navbar";
import { LeftSidebar } from "@/components/ui/LeftSidebar";
import { DataLoader } from "@/components/ui/DataLoader";
import { MemoryOverlay } from "@/components/ui/MemoryOverlay";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-space-deeper">
      {/* 星空背景渐变 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/30 via-space-dark/50 to-space-deeper pointer-events-none" />

      {/* 数据加载 */}
      <DataLoader />

      {/* 3D 地球 */}
      <EarthScene />

      {/* 左侧菜单栏 */}
      <LeftSidebar user={session?.user ?? null} />

      {/* 展开的记忆卡片 overlay（屏幕居中） */}
      <MemoryOverlay />

      {/* 顶部导航 */}
      <Navbar user={session?.user ?? null} />

      {/* 底部提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-white/20 text-xs text-center">
          拖拽旋转 · 滚轮缩放 · 左侧菜单添加旅行记忆
        </p>
      </div>

      {/* 未登录提示 */}
      {!session?.user && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <a
            href="/signin"
            className="glass glass-hover rounded-full px-6 py-2.5 text-sm text-white/80 flex items-center gap-2 no-underline"
          >
            🌍 登录以开始标记你的旅行足迹
          </a>
        </div>
      )}
    </main>
  );
}
