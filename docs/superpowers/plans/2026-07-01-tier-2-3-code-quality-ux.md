# Tier 2 + 3 代码质量与 UX 打磨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tier 2 代码质量（拆分巨石组件、消除重复、统一错误处理）+ Tier 3 UX 打磨（三态组件、键盘无障碍、入场动画、focus ring、DataLoader 反馈）

**Architecture:** 提取 3 个共享子组件（LocationSearch、PhotoUploader、VisibilityToggle）→ 重构 AddMemoryModal 和 EditLocationModal → 统一 toast 错误处理 → 创建 API 错误工厂 → 新增 EmptyState/LoadingState/ErrorState 三态组件接入各处 → 补齐键盘和动画

**Tech Stack:** Next.js 14, React 18, TypeScript, TailwindCSS, Sonner (toast), framer-motion (已有依赖)

## Global Constraints

- 不改动业务逻辑
- 不改动 UI 外观（除 intentional polishing：动画、focus ring、三态组件）
- 不引入新的 npm 依赖
- 所有 modal 必须支持 Esc 关闭
- alert() 必须全部替换为 toast.error()
- LocationSearch 组件必须同时被 AddMemoryModal 和 EditLocationModal 使用

---

### Task 1: 创建 LocationSearch 共享组件 + EditLocationModal 接入

**Files:**
- Create: `src/components/ui/LocationSearch.tsx`
- Modify: `src/components/ui/EditLocationModal.tsx`（替换内联搜索为 LocationSearch）

**Key interfaces:**
```ts
interface LocationSearchProps {
  selectedCoords: { lat: number; lng: number } | null;
  locationName: string;
  selectedAddress: Record<string, string>;
  onSelectLocation: (coords, name, address) => void;
  onClearLocation: () => void;
  onNameChange: (name: string) => void;
  onAddressChange: (addr: Record<string, string>) => void;
  /** EditLocationModal 额外字段填充回调 */
  onLocationSelected?: (data: { name, country, countryCode, city, state, lat, lng }) => void;
}
```

- [ ] **Step 1: 创建 LocationSearch.tsx**

Extract geocode search logic from AddMemoryModal lines 66-135 and JSX lines 329-451. Combine with EditLocationModal's similar search (lines 56-119, JSX lines 182-231). The component accepts props to cover both use cases. Key code:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Search, Loader2, Globe, X } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { formatSearchResult } from "@/lib/types";

function optimizeSearchQuery(input: string): string {
  let q = input.trim();
  if (!q) return q;
  return q.replace(/\s+/g, " ");
}

interface LocationSearchProps {
  selectedCoords: { lat: number; lng: number } | null;
  locationName: string;
  selectedAddress: Record<string, string>;
  onSelectLocation: (coords: { lat: number; lng: number }, name: string, address: Record<string, string>) => void;
  onClearLocation: () => void;
  onNameChange: (name: string) => void;
  onAddressChange: (addr: Record<string, string>) => void;
  compact?: boolean;
}

export function LocationSearch({
  selectedCoords,
  locationName,
  selectedAddress,
  onSelectLocation,
  onClearLocation,
  onNameChange,
  onAddressChange,
  compact = false,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    const currentQuery = searchQuery;
    debounceRef.current = setTimeout(async () => {
      try {
        const optimizedQuery = optimizeSearchQuery(currentQuery);
        if (!optimizedQuery) { setSearchResults([]); return; }
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(optimizedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setSearchResults(data);
        }
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};
    const addressData = {
      country: addr.country || "",
      country_code: addr.country_code || "",
      city: addr.city || addr.town || addr.village || "",
      state: addr.state || "",
    };

    let name = "";
    if (addr.city) name = addr.city;
    else if (addr.town) name = addr.town;
    else if (addr.village) name = addr.village;
    else if (addr.state) name = addr.state;
    else name = formatSearchResult(result).title;
    if (addr.country_code && addr.country_code !== "cn") {
      name = `${name} · ${addr.country || addr.country_code.toUpperCase()}`;
    }

    onSelectLocation({ lat, lng }, name, addressData);
    setSearchResults([]);
    setSearchQuery("");
  };

  const inputClass = compact
    ? "w-full bg-white/[0.07] border border-white/15 rounded-lg pl-3 pr-8 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 transition-colors"
    : "w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors";

  const labelClass = compact ? "text-xs text-white/40 mb-1.5" : "text-xs text-white/40 mb-1.5";

  return (
    <div>
      {!compact && (
        <label className={`flex items-center gap-2 ${labelClass}`}>
          <Search className="w-3.5 h-3.5" />
          搜索地点（支持模糊匹配，如: 东京塔、巴黎铁塔、丽江古城）
        </label>
      )}
      {compact && (
        <label className={`flex items-center gap-2 ${labelClass}`}>
          <Search className="w-3.5 h-3.5" />
          搜索重新匹配地址（可选）
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={compact ? "输入地点名以自动匹配国家城市..." : "输入地点名称，比如：冰岛、东京、丽江..."}
          className={inputClass}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="mt-2 glass max-h-48 overflow-y-auto divide-y divide-white/5">
          {searchResults.map((r, i) => {
            const formatted = formatSearchResult(r);
            return (
              <button key={i} type="button" onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors group">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400/60 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium truncate">{formatted.title}</p>
                    {formatted.subtitle && <p className="text-xs text-white/40 truncate mt-0.5">{formatted.subtitle}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCoords && !compact && (
        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <input type="text" value={locationName} onChange={(e) => onNameChange(e.target.value)}
              placeholder="地点名称（可修改）" required
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20" autoFocus />
          </div>
          {(selectedAddress.country || selectedAddress.city) && (
            <div className="flex items-center gap-2 ml-6">
              <Globe className="w-3 h-3 text-white/25 shrink-0" />
              <input type="text" value={selectedAddress.country || ""}
                onChange={(e) => onAddressChange({ ...selectedAddress, country: e.target.value })}
                placeholder="国家" className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40" />
              <span className="text-white/20 text-[11px]">·</span>
              <input type="text" value={selectedAddress.city || ""}
                onChange={(e) => onAddressChange({ ...selectedAddress, city: e.target.value })}
                placeholder="城市" className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40" />
              {(selectedAddress.state || selectedAddress.country_code) && (
                <span className="text-white/15 text-[10px] ml-1">
                  {selectedAddress.state && `${selectedAddress.state}`}
                  {selectedAddress.state && selectedAddress.country_code && " · "}
                  {selectedAddress.country_code && selectedAddress.country_code.toUpperCase()}
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-white/30 ml-6">
            坐标 {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
            {" · "}
            <button type="button" onClick={onClearLocation}
              className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2">重新搜索</button>
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 修改 EditLocationModal 使用 LocationSearch**

Replace the inline search logic (useEffect + handleSelectLocation, lines 56-119) and search JSX (lines 182-231) with LocationSearch in compact mode. The compact variant shows only the search input + results list; the editing fields (name, country, city) stay separate in EditLocationModal.

- [ ] **Step 3: npm run build 验证 + commit**

```bash
git add src/components/ui/LocationSearch.tsx src/components/ui/EditLocationModal.tsx
git commit -m "refactor: extract shared LocationSearch, use in EditLocationModal"
```

---

### Task 2: 创建 PhotoUploader 组件

**Files:**
- Create: `src/components/ui/PhotoUploader.tsx`
- Modify: `src/components/ui/AddMemoryModal.tsx`（替换内联照片管理为 PhotoUploader）

**Key interfaces:**
```ts
interface PhotoEntry {
  url: string;
  title: string;
  isPublic: boolean;
}

interface PhotoUploaderProps {
  photos: PhotoEntry[];
  onPhotosChange: (photos: PhotoEntry[]) => void;
  uploadingIndex: number | null;
  uploadError: string | null;
  onSelectFile: (index: number) => void;
}
```

- [ ] **Step 1: 创建 PhotoUploader.tsx** — 从 AddMemoryModal 提取 lines 453-586 的 JSX + lines 137-223 的上传逻辑 + 隐藏 file input。约 160 行。

- [ ] **Step 2: AddMemoryModal 使用 PhotoUploader** — 删除内联代码，替换为 `<PhotoUploader photos={photos} ... />`

- [ ] **Step 3: build 验证 + commit**

---

### Task 3: 创建 VisibilityToggle + AddMemoryModal alert→toast + 键盘 Esc

**Files:**
- Create: `src/components/ui/VisibilityToggle.tsx`
- Modify: `src/components/ui/AddMemoryModal.tsx`

- [ ] **Step 1: 创建 VisibilityToggle.tsx** — 公开/私密切换 switch + 规则提示文字。从 AddMemoryModal lines 597-634 提取。

- [ ] **Step 2: AddMemoryModal refactor** — 替换 alert() 为 toast，添加 Esc 关闭 useEffect，使用 VisibilityToggle，使用 LocationSearch（Task 1 产出），使用 PhotoUploader（Task 2 产出）。最终 AddMemoryModal 缩减到 ~80 行编排 shell。

- [ ] **Step 3: commit**

---

### Task 4: API 错误工具 + 批量更新路由

**Files:**
- Create: `src/lib/api-utils.ts`
- Modify: `src/app/api/locations/route.ts`、`src/app/api/locations/[id]/route.ts`、`src/app/api/photos/[id]/route.ts`、`src/app/api/profile/route.ts`、`src/app/api/explore/route.ts`、`src/app/api/memories/route.ts`、`src/app/api/img-proxy/route.ts`

- [ ] **Step 1: 创建 src/lib/api-utils.ts**

```ts
import { NextResponse } from "next/server";

export type ApiErrorBody = { error: string };

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message } satisfies ApiErrorBody, { status });
}

export function successResponse<T>(data: T, status?: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status: status ?? 200,
    headers: extraHeaders,
  });
}
```

- [ ] **Step 2: 批量替换** — 将各路由中的 `NextResponse.json({ error: "..." }, { status: N })` 替换为 `errorResponse("...", N)`。不改变任何错误消息或状态码。仅影响 GET/POST/PATCH/DELETE 路由中的错误返回。

- [ ] **Step 3: commit**

---

### Task 5: 创建 EmptyState / LoadingState / ErrorState 三态组件

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/LoadingState.tsx`
- Create: `src/components/ui/ErrorState.tsx`

- [ ] **Step 1: 创建 EmptyState.tsx**

```tsx
"use client";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon className="w-10 h-10 text-white/15 mb-3" />}
      <p className="text-sm text-white/30">{message}</p>
      {action && onAction && (
        <button onClick={onAction}
          className="mt-3 text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 LoadingState.tsx**

```tsx
"use client";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md";
}

export function LoadingState({ message = "加载中...", size = "md" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <Loader2 className={`text-white/25 animate-spin ${size === "sm" ? "w-4 h-4" : "w-6 h-6"}`} />
      <p className="text-xs text-white/25">{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ErrorState.tsx**

```tsx
"use client";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <AlertTriangle className="w-8 h-8 text-amber-400/40" />
      <p className="text-sm text-white/40">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white/80 border border-white/10 transition-colors">
          重试
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: commit**

---

### Task 6: 接入三态组件 + DataLoader 视觉反馈

**Files:**
- Modify: `src/components/ui/MemoryList.tsx`（空列表 → EmptyState）
- Modify: `src/components/ui/PhotoGrid.tsx`（空照片 → EmptyState）
- Modify: `src/components/ui/ProfileContent.tsx`（切换加载/错误/正常三态）
- Modify: `src/components/ui/DataLoader.tsx`（添加加载指示器）

- [ ] **Step 1: MemoryList 空状态** — 当 `items.length === 0` 时显示 `<EmptyState icon={MapPin} message="还没有旅行记忆" />` 替代当前的空 grid。

- [ ] **Step 2: PhotoGrid 空状态** — 当 `photos.length === 0` 时显示 `<EmptyState icon={ImageIcon} message="还没有照片" />` 替代当前 `return null`。

- [ ] **Step 3: ProfileContent 三态** — 当前使用 toast.error 报告错误。改为：loading 时显示 `<LoadingState />`，error 时显示 `<ErrorState message={...} onRetry={refetch} />`，正常时显示内容。

- [ ] **Step 4: DataLoader 加载指示器** — 在 store 中添加 `dataLoading: boolean` 状态。加载期间在侧边栏底部显示 `<LoadingState size="sm" message="同步数据..." />` 或一个简洁的脉冲圆点。

- [ ] **Step 5: commit**

---

### Task 7: Modal 动画 + 键盘无障碍 + focus ring

**Files:**
- Modify: `src/components/ui/AddMemoryModal.tsx`（键盘 Esc + Enter）
- Modify: `src/components/ui/AddPhotoModal.tsx`（动画 + Esc）
- Modify: `src/components/ui/EditLocationModal.tsx`（已支持键盘 ✅，补齐动画）
- Modify: `src/components/ui/EditPhotoModal.tsx`（动画 + Esc）
- Modify: `src/components/ui/DeleteConfirmModal.tsx`（动画 + Esc）
- Modify: `src/app/globals.css`（focus-visible ring）

- [ ] **Step 1: AddMemoryModal 键盘** — 添加 `useEffect` 监听 `Escape`（关闭）和 `Enter`（当必填项齐全时提交）。

- [ ] **Step 2: Modal 动画统一** — EditLocationModal、AddPhotoModal、EditPhotoModal、DeleteConfirmModal 的容器 div 添加 `animate-in zoom-in-95 fade-in duration-200` className。

- [ ] **Step 3: AddPhotoModal Esc + DeleteConfirmModal Esc** — 添加 Escape 键监听关闭。

- [ ] **Step 4: globals.css 添加 focus-visible**

```css
*:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 5: build 验证 + commit**

---

## 完成检查清单

- [ ] `npm run build` 无错误
- [ ] AddMemoryModal 从 654 行缩减到 ~80 行编排 shell
- [ ] LocationSearch 同时被 AddMemoryModal 和 EditLocationModal 使用
- [ ] 所有 alert() 替换为 toast.error()
- [ ] 全局无原生 alert 调用（`grep -r "alert(" src/` 返回空）
- [ ] 所有 modal 支持 Esc 关闭
- [ ] 所有 modal 有入场动画
- [ ] focus ring 可见
- [ ] 空列表有 EmptyState 提示
- [ ] DataLoader 有加载反馈
