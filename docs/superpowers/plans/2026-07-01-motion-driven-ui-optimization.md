# Motion-Driven UI/UX 优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 #15 Motion-Driven 风格优化流浪地球的 UI/UX：全局设计系统规范化、组件级微交互与动效、入场序列、无障碍降级

**Architecture:** 全局 CSS 定义设计令牌（z-index 层级、毛玻璃标准、过渡时长）；Framer Motion 驱动组件级动画（transform/opacity 仅限 GPU 加速）；`useReducedMotion()` 全局降级

**Tech Stack:** Next.js 14, Framer Motion (已安装), TailwindCSS, TypeScript, React 18

## Global Constraints

- 所有动画仅使用 `transform` + `opacity`（GPU 加速，无 layout thrashing）
- 过渡时长统一：微交互 200ms ease-out，入场 350ms cubic-bezier(0.34,1.56,0.64,1)，大区域 400ms ease-in-out
- z-index 层级：10 (pins), 20 (sidebar/navbar), 30 (modal), 40 (overlay), 50 (toast/global遮罩)
- 毛玻璃标准：`backdrop-blur-[15px]`, `border: 1px solid rgba(255,255,255,0.10)`, `bg-white/[0.07]` (卡片) / `bg-white/[0.10]` (模态框)
- 所有 `motion` 组件必须检查 `prefers-reduced-motion`：降级为 `type: "tween", duration: 0`
- 无 emoji 作为 UI 图标（使用 Lucide SVG）
- 遵循已有 TailwindCSS 暗色太空主题
- 仅修改 CSS/组件样式和动画，不改动业务逻辑、API、数据流

---

### Task 1: 全局 CSS 设计系统 — z-index 层级 & 毛玻璃标准化 & 动效关键帧

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.js`

**Interfaces:**
- Consumes: none (first task)
- Produces: `.glass` / `.glass-modal` / `.glass-card` 工具类, z-index 层级 CSS 变量, 全局动画关键帧 `@keyframes float`, `@keyframes pulse-glow`, `@keyframes slide-in-right`, `@keyframes slide-out-right`, `@keyframes pop-in`

- [ ] **Step 1: 更新 `tailwind.config.js` — 添加动效和 z-index 扩展**

替换 `tailwind.config.js` 的 `theme.extend` 内容：

```js
theme: {
  extend: {
    colors: {
      space: {
        deeper: "#050510",
      },
    },
    zIndex: {
      10: "10",
      20: "20",
      30: "30",
      40: "40",
      50: "50",
    },
    transitionDuration: {
      200: "200ms",
      350: "350ms",
      400: "400ms",
    },
    transitionTimingFunction: {
      "elastic": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
    },
    animation: {
      "float": "float 3s ease-in-out infinite",
      "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      "pop-in": "pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      "slide-in-right": "slide-in-right 0.35s ease-out",
      "slide-out-right": "slide-out-right 0.2s ease-in",
    },
  },
},
```

- [ ] **Step 2: 更新 `src/app/globals.css` — 标准化毛玻璃 + 全局关键帧**

替换 `.glass` 工具类和相关样式。将 `.glass` 和 `.glass-hover` 的定义改为：

```css
@layer utilities {
  .glass {
    @apply bg-white/[0.07] backdrop-blur-[15px] border border-white/10 rounded-2xl;
  }
  .glass-modal {
    @apply bg-white/[0.10] backdrop-blur-[15px] border border-white/10 rounded-2xl;
  }
  .glass-card {
    @apply bg-white/[0.04] backdrop-blur-[15px] border border-white/10 rounded-xl;
  }
  .glass-hover {
    @apply hover:bg-white/[0.10] hover:border-white/[0.15] transition-all duration-200;
  }
  .glass-card-hover {
    @apply hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200;
  }
}
```

在 `@keyframes modal-enter` 之后追加新的关键帧：

```css
/* Motion-Driven 入场动画 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 16px rgba(59, 130, 246, 0.6); }
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0);
  }
  60% {
    transform: scale(1.1);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes slide-out-right {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

/* 模态框入场动画覆盖 — 使用弹性缩放 */
.animate-modal-enter {
  animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 输入框发光 focus */
.input-glow:focus {
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}
```

将现有的 `z-[9999]` 替换逻辑推迟到各组件任务中处理。

- [ ] **Step 3: 验证 CSS + Tailwind 编译**

```bash
npx tsc --noEmit
```

预期：无错误。

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js src/app/globals.css
git commit -m "style: add Motion-Driven design tokens — z-index scale, glassmorphism standards, animation keyframes

- z-index scale: 10 (pins), 20 (sidebar/nav), 30 (modals), 40 (overlay), 50 (toast)
- Glass variants: glass (cards 7%), glass-modal (10%), glass-card (4%)
- Keyframes: float, pulse-glow, pop-in, slide-in-right, slide-out-right
- Modal enter now uses elastic pop-in (0.35s cubic-bezier)
- Input glow utility class

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Toast 通知动画 + 全局 reduce-motion hook

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/lib/use-reduced-motion.ts`

**Interfaces:**
- Consumes: animation keyframes from Task 1
- Produces: `useReducedMotion(): boolean` hook; Toast 配置 with `gap={6}` + `duration={3000}` + rich colors

- [ ] **Step 1: 创建 `src/lib/use-reduced-motion.ts`**

```typescript
"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/** 检测用户是否偏好减少动效，供所有组件统一使用 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
```

- [ ] **Step 2: 更新 `src/app/layout.tsx` — Toaster 动画配置**

修改 `<Toaster>` 组件，更新 `toastOptions`：

```tsx
<Toaster
  position="top-center"
  gap={6}
  duration={3000}
  toastOptions={{
    style: {
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(15px)",
      border: "1px solid rgba(255,255,255,0.10)",
      color: "#fff",
      fontSize: "14px",
    },
  }}
/>
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/lib/use-reduced-motion.ts
git commit -m "feat: add useReducedMotion hook + Toast style refinement

- useReducedMotion wraps framer-motion's hook for consistent usage
- Toast: 15px blur, 8% bg, 6px gap, 3s duration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Navbar 优化 — hover 光晕 + 头像光圈 + scroll 模糊

**Files:**
- Modify: `src/components/ui/Navbar.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-hover` from Task 1
- Produces: Navbar with hover glow on avatar, smooth dropdown transitions

- [ ] **Step 1: 更新 Navbar — 头像光圈 + 下拉菜单过渡**

修改 `src/components/ui/Navbar.tsx`：

1. 在 import 中添加 `{ motion, AnimatePresence }` from `"framer-motion"` 和 `useReducedMotion` from `"@/lib/use-reduced-motion"`：

```typescript
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
```

2. 组件内添加 reduced motion 检测：

```typescript
const prefersReduced = useReducedMotion();
```

3. 用户头像区域 — 添加 hover 光圈效果。修改头像容器，在 `rounded-full` 的 div 外层包裹 motion.div：

```tsx
{user.image ? (
  <motion.div
    whileHover={prefersReduced ? {} : { boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}
    transition={{ duration: 0.3 }}
    className="rounded-full"
  >
    <Image
      src={user.image}
      alt="avatar"
      width={32}
      height={32}
      className="w-8 h-8 rounded-full border border-white/20"
    />
  </motion.div>
) : (
  <motion.div
    whileHover={prefersReduced ? {} : { boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}
    transition={{ duration: 0.3 }}
    className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"
  >
    <User className="w-4 h-4 text-blue-400" />
  </motion.div>
)}
```

4. 下拉菜单 — 用 `AnimatePresence` + `motion.div` 包裹：

```tsx
<AnimatePresence>
  {dropdownOpen && (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={prefersReduced ? {} : { opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute right-0 top-full mt-2 w-40 glass overflow-hidden rounded-lg border border-white/10 shadow-xl"
    >
      {/* ... 现有 Link 和 button 内容不变 ... */}
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Navbar.tsx
git commit -m "feat: Navbar hover glow + dropdown enter/exit animation

- Avatar ring glow on hover (blue glow box-shadow)
- Dropdown menu: AnimatePresence with scale+fade entrance
- Respects prefers-reduced-motion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: LeftSidebar 优化 — 按钮脉冲 + 探索指示器 + 入场动画

**Files:**
- Modify: `src/components/ui/LeftSidebar.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-hover`, `float` animation from Task 1; `useReducedMotion` from Task 2
- Produces: Sidebar with animated add button, explore mode pulse indicator

- [ ] **Step 1: 更新 LeftSidebar 动画**

修改 `src/components/ui/LeftSidebar.tsx`：

1. 顶部 import 添加 Framer Motion：

```typescript
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
```

2. 组件内添加：

```typescript
const prefersReduced = useReducedMotion();
```

3. 侧边栏整体容器 — 添加入场动画。将最外层的 `<div className={cn("absolute top-20 left-4 z-20...` 替换为 `<motion.div>`：

```tsx
<motion.div
  initial={prefersReduced ? {} : { x: -20, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className={cn(
    "absolute top-20 left-4 z-20 transition-all duration-300",
    sidebarOpen
      ? "translate-x-0 opacity-100"
      : "-translate-x-full opacity-0 pointer-events-none"
  )}
>
```

同时将闭合标签 `</div>` 改为 `</motion.div>`。

4. 「添加旅行记忆」按钮 — 添加脉冲动画。在非探索模式下的按钮上追加 className：

```tsx
className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-medium transition-all animate-pulse-glow"
```

5. 探索模式指示器 — 添加绿色脉冲圆点。在「正在探索」标题旁追加：

```tsx
<h2 className="text-sm font-bold text-white flex items-center gap-2">
  <Compass className="w-4 h-4 text-green-400" />
  正在探索
  <span className="relative flex h-2 w-2 ml-0.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
  </span>
</h2>
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LeftSidebar.tsx
git commit -m "feat: LeftSidebar entrance animation + pulse button + explore indicator

- Sidebar slides in from left on mount
- Add Memory button has pulse-glow animation
- Explore mode shows green pulsing dot indicator
- All animations respect prefers-reduced-motion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 模态框统一优化 — 弹性入场 + 输入框 glow + 渐变按钮

**Files:**
- Modify: `src/components/ui/AddMemoryModal.tsx`
- Modify: `src/components/ui/AddPhotoModal.tsx`
- Modify: `src/components/ui/EditLocationModal.tsx`
- Modify: `src/components/ui/EditPhotoModal.tsx`
- Modify: `src/components/ui/DeleteConfirmModal.tsx`

**Interfaces:**
- Consumes: `.glass-modal`, `.input-glow` from Task 1; `useReducedMotion` from Task 2
- Produces: All modals with elastic entrance, glowing inputs, gradient submit buttons

- [ ] **Step 1: 统一模态框外壳样式**

每个 Modal 组件的模态框容器（`<div className="glass w-full max-w-...">`）：

- 将 `glass` 替换为 `glass-modal`
- 将 `animate-modal-enter` 保留（Task 1 已更新为 elastic pop-in）

逐一修改：
- `AddMemoryModal.tsx`: `<div className="glass w-full max-w-lg...` → `<div className="glass-modal w-full max-w-lg...`
- `AddPhotoModal.tsx`: `<div className="glass w-full max-w-sm...` → `<div className="glass-modal w-full max-w-sm...`

对于 `EditLocationModal.tsx`、`EditPhotoModal.tsx`、`DeleteConfirmModal.tsx`，先读取确认类名，再替换。

- [ ] **Step 2: 输入框添加 glow focus**

在每个 Modal 的 `<input>` 和 `<textarea>` 元素上，将现有的 `focus:border-blue-400/50` 改为追加 `input-glow`：

改法：将
```
className="... focus:outline-none focus:border-blue-400/50 ..."
```
改为
```
className="... focus:outline-none focus:border-blue-400/50 input-glow ..."
```

涉及文件：
- `AddMemoryModal.tsx`: 日期 input、textarea
- `AddPhotoModal.tsx`: URL input、标题 input
- `EditLocationModal.tsx`: 名称 input
- `EditPhotoModal.tsx`: 标题 input、描述 textarea

- [ ] **Step 3: 提交按钮改为渐变 + hover 发光**

在每个 Modal 的主提交按钮上，将 `bg-blue-500 hover:bg-blue-600` 改为 `bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400`。

各文件修改位置：
- `AddMemoryModal.tsx`: 「添加到地球」按钮
- `AddPhotoModal.tsx`: 「添加」按钮
- `EditLocationModal.tsx`: 「保存」按钮
- `EditPhotoModal.tsx`: 「保存」按钮
- `DeleteConfirmModal.tsx`: 确认删除按钮（保持红色，不改渐变）

同时所有提交按钮追加 `active:scale-[0.97] transition-transform` 按压反馈。

- [ ] **Step 4: AddMemoryModal/AddPhotoModal 关闭按钮动画**

关闭按钮追加 `hover:rotate-90 transition-transform duration-200`（X 图标）：

```tsx
<X className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
```

外层 button 包裹 `<span className="group">` 改为直接在 button 上加 `group`。

- [ ] **Step 5: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/AddMemoryModal.tsx src/components/ui/AddPhotoModal.tsx src/components/ui/EditLocationModal.tsx src/components/ui/EditPhotoModal.tsx src/components/ui/DeleteConfirmModal.tsx
git commit -m "feat: modal styling — elastic enter, input glow, gradient buttons

- All modals use .glass-modal (10% opacity glass)
- Inputs gain .input-glow on focus (blue glow shadow)
- Submit buttons: gradient blue→cyan, active:scale-[0.97]
- Close X button: hover rotate-90

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: MemoryOverlay 优化 — 卡片色彩 + 浮动动画 + 关闭动画

**Files:**
- Modify: `src/components/ui/MemoryOverlay.tsx`

**Interfaces:**
- Consumes: `float` animation from Task 1; `useReducedMotion` from Task 2
- Produces: Polaroid cards with softened background, subtle floating, glow shadow, smooth exit

- [ ] **Step 1: 更新 MemoryOverlay 样式和动画**

修改 `src/components/ui/MemoryOverlay.tsx`：

1. 顶部 import 添加：

```typescript
import { useReducedMotion } from "@/lib/use-reduced-motion";
```

2. 组件 hooks 区域追加：

```typescript
const prefersReduced = useReducedMotion();
```

3. Polaroid 卡片背景色调整 + 蓝色微光阴影。找到卡片 div 的 style（约 L276-283），修改：

```tsx
style={{
  width: cardWidth,
  transform: "translate(-50%, -50%)",
  padding: "16px 16px 52px 16px",
  boxShadow: isFocused
    ? "5px 10px 32px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.10), 0 0 24px rgba(59,130,246,0.12), 0 0 0 1px rgba(0,0,0,0.04)"
    : "2px 4px 14px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
}}
```

并将 `bg-[#fafaf5]` 改为 `bg-[#e8e8e0]`（柔和暖白）。

4. 非聚焦卡片添加浮动动画。在非聚焦卡片的 `motion.div` 上追加：

```tsx
animate={
  hasEntered
    ? {
        x: layout.x,
        y: layout.y + (isFocused ? 0 : (index % 2 === 0 ? -4 : 4)), // float offset
        rotate: layout.rotate,
        scale: layout.scale,
        opacity: layout.opacity,
        zIndex: layout.zIndex,
        ...(prefersReduced ? {} : { y: [layout.y + (index % 2 === 0 ? -4 : 4), layout.y + (index % 2 === 0 ? 4 : -4), layout.y + (index % 2 === 0 ? -4 : 4)] }),
      }
    : {}
}
transition={{
  ...springConfig,
  y: prefersReduced ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "easeInOut" },
}}
```

简化实现：直接在非聚焦卡片上使用 CSS `animate-float`（仅在 `className` 中追加 `${!isFocused ? 'animate-float' : ''}`），而不是 Framer Motion y 动画。CSS 方案更简单且性能更好。

实际实现 — 在 `<motion.div>` 的 className 中追加：

```tsx
className={`absolute cursor-pointer select-none ${!isFocused ? 'animate-float' : ''}`}
```

- [ ] **Step 2: 关闭按钮 + Overlay 退出动画**

Overlay 外层已有点击遮罩关闭。在关闭时添加 200ms 退出 — 由于 MemoryOverlay 是条件渲染的（`if (!expandedMemory) return null`），添加退出动画需要改为 `AnimatePresence` 包裹。

如果页面级未使用 AnimatePresence，则换用更轻量的方案：关闭时给 body 元素添加一个 CSS class 触发 fadeOut。由于这过于复杂，改为**不修改退出逻辑**（已有即时关闭 + esc，满足要求）。遮罩本身已有 `backdrop-blur-sm`。

保持现有关闭逻辑不变。

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/MemoryOverlay.tsx
git commit -m "feat: MemoryOverlay polaroid refinements — softer warm-white, blue glow shadow, float animation

- Card bg: #fafaf5 → #e8e8e0 (less harsh on dark space theme)
- Focused card adds subtle blue glow (rgba 59,130,246,0.12)
- Non-focused cards have CSS float animation (animate-float)
- Uses useReducedMotion for accessibility

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: CommentPanel 卡片化 — 评论卡片 + 入场/删除动画

**Files:**
- Modify: `src/components/ui/CommentPanel.tsx`

**Interfaces:**
- Consumes: `.glass-card`, `.glass-card-hover` from Task 1; `useReducedMotion` from Task 2; slide keyframes from Task 1
- Produces: Comments as individual cards with slide-in entrance, slide-out delete

- [ ] **Step 1: 评论卡片化 + 入场动画**

修改 `src/components/ui/CommentPanel.tsx`：

1. 顶部 import 添加：

```typescript
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
```

2. 组件内添加：

```typescript
const prefersReduced = useReducedMotion();
```

3. 评论列表渲染 — 每条评论包裹在 `<motion.div>` 中，使用卡片样式 + slide-in-right 入场。将现有的顶级评论 `<div key={comment.id}>` 改为：

```tsx
<AnimatePresence>
  {comments.map((comment) => (
    <motion.div
      key={comment.id}
      initial={prefersReduced ? {} : { x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={prefersReduced ? {} : { x: 20, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-card glass-card-hover p-2.5 space-y-1.5"
    >
      {/* 现有评论内容不变 */}
    </motion.div>
  ))}
</AnimatePresence>
```

4. 子回复列表也包裹在卡片样式中。将 `comment.replies.map(...)` 中的最外层 div 添加：

```tsx
className="ml-5 pl-2 border-l border-white/10 space-y-1.5"
```

每条子回复 `<div key={reply.id}>` 改为：

```tsx
<div key={reply.id} className="bg-white/[0.03] rounded-lg p-2">
```

5. 评论间隔 — 移除 `space-y-4`，因为每条评论现在是独立卡片（自带圆角边框），不需要额外间距。将评论列表容器的 `space-y-4` 改为 `space-y-2.5`。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/CommentPanel.tsx
git commit -m "feat: CommentPanel card-ification — glass cards, slide-in/out animation

- Each comment as .glass-card with hover effect
- AnimatePresence for enter/exit animations
- Replies with subtle bg-white/[0.03] card style
- Reduced gap between cards

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 地球加载序列 — Stars + Earth + Pins 入场动画

**Files:**
- Modify: `src/components/earth/EarthCanvas.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useReducedMotion` from Task 2
- Produces: Staggered page-load sequence: stars → earth fade-in → sidebar → pins pop-in

- [ ] **Step 1: 更新 `src/components/earth/EarthCanvas.tsx` — 加载完成后地球淡入**

Read `EarthCanvas.tsx` 确认当前 Canvas 容器结构。

在 Canvas 外层包裹 motion.div 实现淡入：

```tsx
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// 组件内
const prefersReduced = useReducedMotion();

return (
  <motion.div
    initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="absolute inset-0"
  >
    {/* 现有 Canvas 内容 */}
  </motion.div>
);
```

- [ ] **Step 2: 更新 `src/app/page.tsx` — 协调入场序列**

在 page.tsx 的客户端组件部分（如果主页面逻辑在 `page.tsx` 中），确认 EarthScene、LeftSidebar 的渲染顺序。通过 CSS animation-delay 或 Framer Motion `transition.delay` 实现 stagger：

- Stars: 0ms
- Earth: 200ms delay（Task 8 Step 1 中已设，加 delay: 0.2）
- LeftSidebar: 400ms delay（Task 4 中已有入场动画，加 delay: 0.4）

EarthCanvas 的 `transition` 中加 `delay: 0.2`：

```tsx
transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
```

LeftSidebar 的 `transition` 中加 `delay: 0.4`（Task 4 Step 1 的代码更新）。

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/earth/EarthCanvas.tsx src/app/page.tsx
git commit -m "feat: page load sequence — earth fade-in + staggered sidebar

- Earth canvas fades in with slight scale-up (0.8s, 200ms delay)
- Sidebar slides in after earth (400ms delay)
- Respects prefers-reduced-motion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: LocationPins 微交互 — hover 发光 + 新增弹入 + click 波纹

**Files:**
- Modify: `src/components/earth/LocationPins.tsx`

**Interfaces:**
- Consumes: `useReducedMotion` from Task 2; `pop-in` keyframe from Task 1
- Produces: Pins with hover glow, click ripple, new pin pop-in

- [ ] **Step 1: Pin hover 发光 + 放大**

修改 `src/components/earth/LocationPins.tsx` 中的 `FocusedPhoto` 组件：

1. 现有 `transition-colors` 改为 `transition-all duration-300`，追加 hover 发光：

```tsx
className="bg-black/90 rounded-md overflow-hidden border border-white/20 shadow-lg cursor-pointer hover:border-blue-400/60 hover:shadow-[0_0_16px_rgba(59,130,246,0.4)] transition-all duration-300"
```

2. hover 时 scale 放大 — 使用 CSS 而非 Framer Motion（Html 内不便使用 motion）：

```tsx
style={{ width: 40, fontSize: 0 }}
```

改为在 hover 时变大。由于 style 是 inline，用 CSS class 实现：

将外层 div 变为可 hover scale 的容器。追加 CSS 类 `hover:scale-125`，配合 `transition-transform duration-300`。

但由于 Html 组件内使用 CSS transform 可能与 drei 的 transform 冲突，采用更安全的方式：仅使用 `hover:border-blue-400/60` + `hover:shadow` 发光。

- [ ] **Step 2: 新 Pin 弹入动画**

为每个 `FocusedPhoto` 添加 pop-in 动画 class：

```tsx
className="... animate-pop-in"
```

仅在 pins 数组新增元素时触发。由于 CSS animation 在元素 mount 时自动播放，天然满足"新增时弹入"的需求。

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/earth/LocationPins.tsx
git commit -m "feat: LocationPins micro-interactions — hover glow + pop-in on mount

- Pin hover: blue glow shadow + border highlight
- New pins animate with pop-in keyframe on mount
- All animations GPU-friendly (transform/opacity)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: 最终验证 — reduce-motion 全局检查 + tsc + build

**Files:**
- Modify: 可能微调上述所有已修改文件
- Read: `.env.example`（不修改）

**Interfaces:**
- Consumes: all prior tasks
- Produces: verified full build, all animations have reduced-motion fallbacks

- [ ] **Step 1: 全局 grep 检查 z-index 异常值**

```bash
grep -r "z-\[9" src/components/ --include="*.tsx"
```

预期：应找到 MemoryOverlay 中的 `z-[9999]`（如果有）。将其替换为 `z-40`。

```bash
grep -r "z-50" src/components/ --include="*.tsx" | grep -v "z-50"
```

确认无任意超大 z-index。

- [ ] **Step 2: 全局 grep 检查是否所有 motion 组件都用了 useReducedMotion**

```bash
grep -r "motion\." src/components/ --include="*.tsx" -l
```

列出所有使用 motion 的组件，确认均已导入 `useReducedMotion` 并在 `initial`/`animate`/`exit` 中有条件降级。

手动检查清单：
- [ ] Navbar.tsx — ✅
- [ ] LeftSidebar.tsx — ✅
- [ ] CommentPanel.tsx — ✅
- [ ] EarthCanvas.tsx — ✅

- [ ] **Step 3: TypeScript 编译**

```bash
npx tsc --noEmit
```

预期：无错误。

- [ ] **Step 4: Next.js 生产构建**

```bash
npx next build 2>&1 | tail -20
```

预期：构建成功，无错误。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final Motion-Driven verification — z-index audit, reduced-motion coverage, build check

- Replaced any remaining z-[9999] with z-40
- Confirmed all motion components have reduced-motion fallbacks
- tsc --noEmit and next build pass clean

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 验证清单

完成后手动验证：

1. **首次加载：** 页面刷新 → 地球淡入 + 放大（800ms）→ 侧边栏延迟滑入 → pins 逐个弹入
2. **Pin hover：** 鼠标悬停 pin → 蓝色光晕扩散 + 边框变亮（300ms）
3. **Pin 点击：** 点击 pin → 飞行 + MemoryOverlay 展开（现有逻辑）
4. **模态框：** 打开任意 Modal → 弹性缩放入场（350ms），输入框 focus 有蓝色发光
5. **按钮：** hover 上浮 + 渐变变化，click 按压缩小
6. **Toast：** 通知触发 → 右侧滑入（sonner 默认行为 + 配置）
7. **评论卡片：** 发评论 → slide-in-right 入场；删评论 → slide-out-right 退出
8. **探索模式：** 切换探索用户 → 指示器绿色脉冲
9. **reduce-motion：** 系统设置开启「减少动态效果」→ 所有动画 instant
10. **构建：** `npx tsc --noEmit` + `npx next build` 通过
