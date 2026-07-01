# Tier 1 性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首屏加载性能从 ~5s 优化到 ~2s，通过 bundle 分包、渐进渲染、图片懒加载、API 缓存和纹理自托管五项措施。

**Architecture:** 保持现有 Next.js 14 App Router + Three.js/R3F 架构不变，增量优化：next.config.js 手动分包、`next/dynamic` 懒加载模态框、`<Suspense>` 边界分离即时与延迟渲染、`Cache-Control` 响应头、`loading="lazy"` 图片属性。

**Tech Stack:** Next.js 14, Three.js + @react-three/fiber + @react-three/drei, TypeScript, TailwindCSS

## Global Constraints

- 不改动业务逻辑和 UI 外观
- 不引入新的 npm 依赖
- 所有 `next/dynamic` 需带 `ssr: false`（three.js 仅客户端）
- `Cache-Control` 设为 `private`（用户数据敏感）
- 保留 `preserveDrawingBuffer` 为 false（当前无截图功能使用）

---

### Task 1: 地球纹理自托管

**Files:**
- Create: `public/textures/earth.jpg`（从 unpkg CDN 下载）
- Modify: `src/components/earth/Earth.tsx:13-15`

**Interfaces:**
- Produces: `Earth` 组件使用 `/textures/earth.jpg` 本地路径，不再依赖 external CDN

- [ ] **Step 1: 下载地球纹理到 public/ 目录**

```bash
mkdir -p public/textures
curl -L -o public/textures/earth.jpg "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
```

验证：`ls -lh public/textures/earth.jpg` 应显示文件大小 > 500KB

- [ ] **Step 2: 修改 Earth.tsx 使用本地纹理路径**

`src/components/earth/Earth.tsx` 第 13-15 行，将：

```tsx
const colorMap = useTexture(
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
);
```

改为：

```tsx
const colorMap = useTexture("/textures/earth.jpg");
```

- [ ] **Step 3: 本地验证**

```bash
npm run dev
```

打开浏览器 → 检查 Network 面板：`earth.jpg` 应从 `localhost:3000/textures/earth.jpg` 加载（本地静态文件，非 unpkg CDN），状态码 200，体积约 1-3MB。

- [ ] **Step 4: Commit**

```bash
git add public/textures/earth.jpg src/components/earth/Earth.tsx
git commit -m "perf: self-host earth texture instead of unpkg CDN"
```

---

### Task 2: Bundle 分层 & 手动分包 + 模态框懒加载

**Files:**
- Modify: `next.config.js`（新增 experimental + splitChunks）
- Modify: `src/components/ui/LeftSidebar.tsx:14`（AddMemoryModal → dynamic import）
- Modify: `src/components/ui/MemoryList.tsx:6-8`（EditLocationModal, AddPhotoModal → dynamic import）
- Modify: `src/components/ui/PhotoGrid.tsx:5-6`（EditPhotoModal → dynamic import）

**Interfaces:**
- Consumes: 现有 modal 组件的 default export
- Produces: `next/dynamic` wrapped modal components; three/vendor chunk 独立缓存

- [ ] **Step 1: 修改 next.config.js 添加分包配置**

将 `next.config.js` 完整替换为：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: "vendor-three",
            chunks: "all",
            priority: 20,
          },
          modals: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/](AddMemoryModal|EditLocationModal|EditPhotoModal|AddPhotoModal|DeleteConfirmModal)/,
            name: "modals",
            chunks: "all",
            priority: 15,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: LeftSidebar — AddMemoryModal 懒加载**

`src/components/ui/LeftSidebar.tsx`，删除第 14 行的静态 import：

```tsx
// 删除这行：
import { AddMemoryModal } from "./AddMemoryModal";
```

在文件顶部（"use client" 之后、其他 import 之前）添加 dynamic import：

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useEarthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const AddMemoryModal = dynamic(
  () => import("./AddMemoryModal").then((m) => ({ default: m.AddMemoryModal })),
  { ssr: false }
);
```

其余代码不变。

- [ ] **Step 3: MemoryList — EditLocationModal, AddPhotoModal 懒加载**

`src/components/ui/MemoryList.tsx`，删除第 6-8 行：

```tsx
// 删除这三行：
import { EditLocationModal } from "./EditLocationModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { AddPhotoModal } from "./AddPhotoModal";
```

在文件顶部（"use client" 之后）添加 dynamic imports，保留 DeleteConfirmModal 的静态 import（它很小）：

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Pencil, Trash2, MapPin, Image, Plus } from "lucide-react";
import { PhotoGrid } from "./PhotoGrid";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { PhotoItem, LocationItem } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

const EditLocationModal = dynamic(
  () =>
    import("./EditLocationModal").then((m) => ({
      default: m.EditLocationModal,
    })),
  { ssr: false }
);

const AddPhotoModal = dynamic(
  () =>
    import("./AddPhotoModal").then((m) => ({ default: m.AddPhotoModal })),
  { ssr: false }
);
```

其余代码不变。

- [ ] **Step 4: PhotoGrid — EditPhotoModal 懒加载**

`src/components/ui/PhotoGrid.tsx`，删除第 5 行：

```tsx
// 删除这行：
import { EditPhotoModal } from "./EditPhotoModal";
```

在 "use client" 之后添加 dynamic import：

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { PhotoItem } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

const EditPhotoModal = dynamic(
  () =>
    import("./EditPhotoModal").then((m) => ({
      default: m.EditPhotoModal,
    })),
  { ssr: false }
);
```

其余代码不变。

- [ ] **Step 5: 构建验证 bundle 拆分效果**

```bash
npm run build
```

检查 `.next/` 目录下应出现独立的 `vendor-three` chunk 和 `modals` chunk。终端构建输出应显示：
- `vendor-three` chunk 体积 ~400KB+ (gzipped ~120KB)
- `modals` chunk 体积 < 50KB
- 首屏公共 JS 显著减小

- [ ] **Step 6: 运行 dev 验证功能正常**

```bash
npm run dev
```

验证流程：
1. 打开首页 — 地球正常渲染
2. 点击「添加旅行记忆」— modal 正常弹出（首次点击从网络加载 modal chunk）
3. Profile 页 — MemoryList 展开、编辑/添加照片 modal 正常弹出
4. 所有 modal 功能和之前完全一致

- [ ] **Step 7: Commit**

```bash
git add next.config.js \
  src/components/ui/LeftSidebar.tsx \
  src/components/ui/MemoryList.tsx \
  src/components/ui/PhotoGrid.tsx
git commit -m "perf: bundle splitting + lazy-load heavy modals with next/dynamic"
```

---

### Task 3: 首屏渐进渲染

**Files:**
- Modify: `src/components/earth/EarthCanvas.tsx:25-28`（关 preserveDrawingBuffer）
- Modify: `src/components/earth/EarthScene.tsx:47-59`（优化 loading skeleton）
- Modify: `src/app/page.tsx:9-10,70-71`（Suspense 分离 Navbar 和 EarthScene）

**Interfaces:**
- Consumes: `EarthCanvas`, `Navbar` 组件
- Produces: Navbar 即时渲染，EarthScene 延迟渲染带 skeleton

- [ ] **Step 1: 关闭 preserveDrawingBuffer**

`src/components/earth/EarthCanvas.tsx` 第 25-31 行，将 `preserveDrawingBuffer: true` 改为 `false`：

```tsx
gl={{
  antialias: false,
  alpha: true,
  preserveDrawingBuffer: false,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: false,
}}
```

整行从 `true` → `false`。

- [ ] **Step 2: 优化 EarthScene loading skeleton**

`src/components/earth/EarthScene.tsx` 第 47-59 行，将 loading spinner 改为更沉浸的加载态：

```tsx
const EarthCanvas = dynamic(
  () => import("./EarthCanvas").then((mod) => mod.EarthCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#050510]">
        <div className="text-center space-y-6">
          {/* 地球占位圆 */}
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/5 flex items-center justify-center">
            <span className="text-5xl animate-pulse">🌍</span>
          </div>
          <div className="space-y-2">
            <p className="text-white/60 text-sm font-medium">流浪地球</p>
            <div className="w-40 h-1 mx-auto rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-blue-400/40 to-transparent rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    ),
  }
);
```

- [ ] **Step 3: page.tsx 添加 Suspense 边界分离 Navbar**

`src/app/page.tsx`，在 import 区添加 `Suspense`：

第 1 行 import 改为：

```tsx
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { EarthScene } from "@/components/earth/EarthScene";
import { Navbar } from "@/components/ui/Navbar";
import { LeftSidebar } from "@/components/ui/LeftSidebar";
import { RightSidebar } from "@/components/ui/RightSidebar";
import { DataLoader } from "@/components/ui/DataLoader";
import { MemoryOverlay } from "@/components/ui/MemoryOverlay";
```

将 JSX 中 `<EarthScene />` 和 `<Navbar />` 包裹为：

```tsx
{/* 顶部导航 — 即时渲染 */}
<Navbar user={session?.user ?? null} />

{/* 3D 地球 — 延迟渲染，不阻塞导航和底部提示 */}
<Suspense fallback={null}>
  <EarthScene />
</Suspense>
```

注意：`<EarthScene />` 自身已有 dynamic import loading skeleton，这里的 `Suspense` fallback 可以设为 `null`（或者复用一个简洁加载态），因为 EarthScene 内部已经处理了 loading 展示。但包裹 Suspense 边界可以让 React 在 EarthScene 的 dynamic import 完成前先提交 Navbar 和底部提示。

- [ ] **Step 4: 本地验证**

```bash
npm run dev
```

验证：
1. 打开首页 — Navbar 应立即出现，不闪烁
2. 地球加载前 — 应看到新的 skeleton（地球图标 + loading bar）
3. 地球加载后 — skeleton 平滑替换为 3D 地球
4. 旋转/缩放功能正常

- [ ] **Step 5: Commit**

```bash
git add src/components/earth/EarthCanvas.tsx \
  src/components/earth/EarthScene.tsx \
  src/app/page.tsx
git commit -m "perf: progressive rendering — disable preserveDrawingBuffer, skeleton UX, Suspense boundary"
```

---

### Task 4: 图片懒加载 + 模糊占位

**Files:**
- Modify: `src/components/earth/LocationPins.tsx:122-127`（img 标签添加 lazy + decoding + transition）
- Modify: `src/components/ui/PhotoGrid.tsx:23-27`（img 标签添加 lazy + decoding）
- Modify: `src/components/ui/MemoryList.tsx:36-40`（img 标签添加 lazy + decoding）
- Modify: `src/components/ui/MemoryOverlay.tsx:288-298`（img 标签添加 lazy + decoding）

**Interfaces:**
- Consumes: 各处 `<img>` 标签和 `getSafeImageUrl` 工具函数
- Produces: 所有图片标签具有 `loading="lazy"`、`decoding="async"` 和 CSS `opacity` 过渡

- [ ] **Step 1: LocationPins FocusedPhoto — 懒加载 + opacity 过渡**

`src/components/earth/LocationPins.tsx` 第 122-127 行，将 img 标签：

```tsx
<img
  src={getSafeImageUrl(photoUrl)}
  alt={pin.name}
  style={{ width: 40, height: 28, objectFit: "cover", display: "block" }}
/>
```

改为：

```tsx
<img
  src={getSafeImageUrl(photoUrl)}
  alt={pin.name}
  loading="lazy"
  decoding="async"
  style={{
    width: 40,
    height: 28,
    objectFit: "cover",
    display: "block",
    opacity: 0,
    transition: "opacity 0.3s ease-in",
  }}
  onLoad={(e) => {
    (e.currentTarget as HTMLImageElement).style.opacity = "1";
  }}
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).style.opacity = "0.5";
  }}
/>
```

- [ ] **Step 2: PhotoGrid PhotoCard — 懒加载 + opacity 过渡**

`src/components/ui/PhotoGrid.tsx` 第 23-27 行，将 img 标签：

```tsx
<img
  src={getSafeImageUrl(photo.url)}
  alt={photo.title || ""}
  className="w-full h-full object-cover"
/>
```

改为：

```tsx
<img
  src={getSafeImageUrl(photo.url)}
  alt={photo.title || ""}
  loading="lazy"
  decoding="async"
  className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
  onLoad={(e) => {
    (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
  }}
/>
```

- [ ] **Step 3: MemoryList MemoryCard — 懒加载 + opacity 过渡**

`src/components/ui/MemoryList.tsx` 第 36-40 行，将 img 标签：

```tsx
<img
  src={getSafeImageUrl(item.coverUrl)}
  alt={item.name}
  className="w-full h-full object-cover"
/>
```

改为：

```tsx
<img
  src={getSafeImageUrl(item.coverUrl)}
  alt={item.name}
  loading="lazy"
  decoding="async"
  className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
  onLoad={(e) => {
    (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
  }}
/>
```

- [ ] **Step 4: MemoryOverlay — 懒加载 + opacity 过渡**

`src/components/ui/MemoryOverlay.tsx` 第 288-298 行，将 img 标签：

```tsx
<img
  src={getSafeImageUrl(photo.url)}
  alt={photo.title || pin.name}
  className="block w-full object-cover"
  style={{ aspectRatio: cardImageAspect }}
  draggable={false}
  onError={(e) => {
    e.currentTarget.src =
      "data:image/svg+xml,...";
  }}
/>
```

改为（在 className 中添加 `opacity-0 transition-opacity duration-500`，已有的 `onError` 保持不变）：

```tsx
<img
  src={getSafeImageUrl(photo.url)}
  alt={photo.title || pin.name}
  className="block w-full object-cover opacity-0 transition-opacity duration-500"
  style={{ aspectRatio: cardImageAspect }}
  draggable={false}
  onLoad={(e) => {
    (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
  }}
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
    e.currentTarget.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23e5e5e5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage%3C/text%3E%3C/svg%3E";
  }}
/>
```

- [ ] **Step 5: 本地验证**

```bash
npm run dev
```

验证：
1. 地球上的浮空迷你卡片 — 图片应先透明，加载后 fade in
2. Profile 页 — MemoryList 封面图、PhotoGrid 照片应 fade in
3. 点击地点弹出的 MemoryOverlay — Polaroid 卡片应 fade in
4. Network 面板 — 所有图片请求标记为 `lazy`（非 blocking）

- [ ] **Step 6: Commit**

```bash
git add src/components/earth/LocationPins.tsx \
  src/components/ui/PhotoGrid.tsx \
  src/components/ui/MemoryList.tsx \
  src/components/ui/MemoryOverlay.tsx
git commit -m "perf: lazy-load images with native loading=lazy + opacity fade-in transition"
```

---

### Task 5: API 缓存策略

**Files:**
- Modify: `src/app/api/locations/route.ts:78-83`（GET 响应添加 Cache-Control）
- Modify: `src/app/api/profile/route.ts:21`（GET 响应添加 Cache-Control）
- Modify: `src/app/api/explore/route.ts:103-110`（GET 响应添加 Cache-Control）

**Interfaces:**
- Consumes: 各 GET 路由的 `NextResponse.json()` 调用
- Produces: 响应头含 `Cache-Control: private, max-age=30, stale-while-revalidate=60`

- [ ] **Step 1: GET /api/locations 添加缓存头**

`src/app/api/locations/route.ts` 第 78 行，将：

```ts
return NextResponse.json({
  items: pins,
  total,
  page,
  totalPages: Math.ceil(total / limit),
});
```

改为：

```ts
return NextResponse.json(
  {
    items: pins,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  },
  {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  }
);
```

注意：POST 路由不添加缓存头（写操作不应缓存）。

- [ ] **Step 2: GET /api/profile 添加缓存头**

`src/app/api/profile/route.ts` 第 21 行，将：

```ts
return NextResponse.json(user);
```

改为：

```ts
return NextResponse.json(user, {
  headers: {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
  },
});
```

注意：PATCH 路由不添加缓存头（写操作不应缓存）。

- [ ] **Step 3: GET /api/explore 添加缓存头**

`src/app/api/explore/route.ts` 第 103 行，将：

```ts
return NextResponse.json({
  user: {
    id: picked.user.id,
    name: picked.user.name,
    image: picked.user.image,
  },
  locations: pins,
});
```

改为：

```ts
return NextResponse.json(
  {
    user: {
      id: picked.user.id,
      name: picked.user.name,
      image: picked.user.image,
    },
    locations: pins,
  },
  {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  }
);
```

注意：`empty: true` 响应（第 72-76 行）也需添加同样缓存头。将第 72-76 行的：

```ts
return NextResponse.json(
  { empty: true, message: msg },
  { status: 200 }
);
```

改为：

```ts
return NextResponse.json(
  { empty: true, message: msg },
  {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  }
);
```

- [ ] **Step 4: 本地验证**

```bash
npm run dev
```

打开浏览器 DevTools → Network 面板：
1. 刷新首页 → `/api/locations?userId=...` 响应头应包含 `Cache-Control: private, max-age=30, stale-while-revalidate=60`
2. 打开 Profile 页 → `/api/profile` 响应头应包含相同 Cache-Control
3. 点击「探索全球」→ `/api/explore` 响应头应包含相同 Cache-Control
4. 30 秒内连续刷新 — 浏览器应优先从 disk cache 获取（状态码 200，标注 `(disk cache)`）

- [ ] **Step 5: Commit**

```bash
git add src/app/api/locations/route.ts \
  src/app/api/profile/route.ts \
  src/app/api/explore/route.ts
git commit -m "perf: add Cache-Control headers to GET API responses (30s + SWR 60s)"
```

---

## 完成检查清单

在所有 task 完成后：

- [ ] `npm run build` 无错误，vendor-three chunk 独立输出
- [ ] `npm run dev` 首页 Navbar 即时渲染，地球 skeleton → 3D 渲染平滑过渡
- [ ] 地球纹理从 `/textures/earth.jpg` 加载（Network 面板验证）
- [ ] 浮空迷你卡片、PhotoGrid、MemoryList、MemoryOverlay 图片均 fade in
- [ ] API 响应头含 `Cache-Control: private, max-age=30, stale-while-revalidate=60`
- [ ] 添加记忆、编辑、删除 modal 功能正常（懒加载后首次点击略有延迟是正常的）
