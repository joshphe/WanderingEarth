import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { EarthScene } from "@/components/earth/EarthScene";
import { EarthWrapper } from "@/components/earth/EarthWrapper";
import { Navbar } from "@/components/ui/Navbar";
import { LeftSidebar } from "@/components/ui/LeftSidebar";
import { RightSidebar } from "@/components/ui/RightSidebar";
import { DataLoader } from "@/components/ui/DataLoader";
import { MemoryOverlay } from "@/components/ui/MemoryOverlay";
import { TourPlayButton } from "@/components/earth/TourPlayButton";
import { ExploreStarter } from "@/components/ui/ExploreStarter";
import { AuthPanel } from "@/components/ui/AuthPanel";
import { GuestCTA } from "@/components/ui/GuestCTA";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#050510]">
      {/* 多层动态星云背景 — 彩色光团以不同速率漂移 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 层1: 紫色星云 — 左上 */}
        <div
          className="absolute nebula-layer-1"
          style={{
            width: "90%", height: "80%",
            left: "-15%", top: "-10%",
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(138, 43, 226, 0.28) 0%, transparent 60%)",
          }}
        />
        {/* 层2: 蓝色星云 — 右下 */}
        <div
          className="absolute nebula-layer-2"
          style={{
            width: "80%", height: "70%",
            right: "-20%", bottom: "-15%",
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0, 140, 240, 0.22) 0%, transparent 60%)",
          }}
        />
        {/* 层3: 青蓝色星云 — 左中 */}
        <div
          className="absolute nebula-layer-3"
          style={{
            width: "70%", height: "60%",
            left: "-10%", top: "30%",
            background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(0, 200, 180, 0.16) 0%, transparent 55%)",
          }}
        />
        {/* 层4: 粉橙星云 — 右上方 */}
        <div
          className="absolute nebula-layer-4"
          style={{
            width: "75%", height: "55%",
            right: "-10%", top: "-5%",
            background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255, 60, 120, 0.14) 0%, transparent 55%)",
          }}
        />
        {/* 层5: 琥珀暖光 — 底部中央 */}
        <div
          className="absolute nebula-layer-5"
          style={{
            width: "60%", height: "40%",
            left: "15%", bottom: "-5%",
            background: "radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255, 140, 40, 0.08) 0%, transparent 60%)",
          }}
        />
        {/* 深空基底 */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(20, 15, 60, 0.6) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 顶部导航 — 即时渲染 */}
      <Navbar user={session?.user ?? null} />

      {/* 3D 地球 — 登录面板打开时左移腾出空间 */}
      <EarthWrapper>
        <EarthScene />
      </EarthWrapper>

      {/* 社区入口跳转：检测 ?explore=userId 参数 */}
      <Suspense fallback={null}>
        <ExploreStarter />
      </Suspense>

      {/* 数据加载 — 登录后加载自己数据，未登录加载公开随机地点 */}
      <DataLoader userId={session?.user?.id} />

      {session?.user ? (
        <>
          <LeftSidebar user={session.user} />

          {/* 右侧足迹面板 — 仅登录后显示 */}
          <RightSidebar />

          {/* 展开的记忆卡片 overlay（屏幕居中） */}
          <MemoryOverlay />

          {/* 飞行巡演播放按钮 */}
          <TourPlayButton />
        </>
      ) : (
        /* 未登录提示 — 点击打开右侧登录面板 */
        <GuestCTA />
      )}

      {/* 右侧登录/注册面板 */}
      <AuthPanel />

      {/* 底部提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-white/20 text-xs text-center">
          拖拽旋转 · 滚轮缩放{session?.user ? " · 左侧菜单添加旅行记忆" : ""}
        </p>
      </div>
    </main>
  );
}
