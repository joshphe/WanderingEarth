# 流浪地球 — 性能 / 代码质量 / UX 分层优化设计

**日期**: 2026-07-01
**状态**: Tier 1 执行中

---

## 总览

三层优化：Tier 1 性能（优先级最高）→ Tier 2 代码质量 → Tier 3 UX 打磨。

---

## Tier 1 — 性能优化

### 1.1 Bundle 分层 & 手动分包

- `next.config.js` 新增 `experimental.optimizePackageImports` 针对 `three`、`@react-three/fiber`、`@react-three/drei`
- 手动 `splitChunks` 将 three 生态拆为独立 vendor chunk（浏览器长效缓存）
- AddMemoryModal、EditLocationModal 改为 `next/dynamic` 懒加载（modal 代码仅在打开时下载）

### 1.2 首屏渐进渲染

- `preserveDrawingBuffer: true` → `false`（无截图需求，省 50% 显存）
- 地球纹理自托管：下载至 `/public/textures/earth.jpg`，`Earth.tsx` 改为本地路径
- EarthScene 加载态：当前 spinner → 深空背景 + Logo skeleton
- `<Suspense>` 边界分离 Navbar（即时渲染）和 3D Scene（延迟渲染）

### 1.3 图片懒加载 + 模糊占位

- 所有 `<img>` 添加 `loading="lazy"` + `decoding="async"`
- `getSafeImageUrl` 扩展 CSS 过渡，LocationPins `FocusedPhoto` 添加 opacity 动画

### 1.4 API 缓存

- GET `/api/locations`、`/api/profile`、`/api/explore` 添加 `Cache-Control: private, max-age=30, stale-while-revalidate=60`

### 1.5 地球纹理自托管

- `/public/textures/earth.jpg` 替代 unpkg CDN 外链
- 利用 Next.js 静态文件服务和浏览器缓存

---

## Tier 2 — 代码质量（后续）

- AddMemoryModal（654 行）拆分为：LocationSearch、PhotoUploader、VisibilityToggle、ReviewAndSubmit 子组件
- EditLocationModal、RightSidebar 适度拆分
- 统一 API 路由的错误处理模式（`ApiError` 类 + `errorResponse` 工厂）
- TypeScript strict null check 补充关键类型

## Tier 3 — UX 打磨（后续）

- 统一 Loading / Empty / Error 三态组件
- 页面过渡动画（framer-motion `AnimatePresence`）
- 交互反馈微调（hover ripple、focus ring）
- 键盘无障碍（Tab 序、Esc 关闭 modal）

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-01 | 初始 spec；Tier 1 开始执行 |
