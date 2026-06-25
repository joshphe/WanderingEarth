# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-featured `/profile` personal center page where users can view stats, browse/search/paginate their travel memories, edit/delete locations and photos, and update their profile name.

**Architecture:** Extend 4 existing API routes, create 2 new API routes, then build the profile page as a Server Component wrapping a Client Component (ProfileContent) that manages all UI state. Follows existing project patterns: RESTful API routes with NextAuth auth checks, TailwindCSS `glass` utility.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma, NextAuth.js v5, TailwindCSS, sonner (toast), lucide-react (icons)

## Global Constraints

- All API routes that modify data must verify `session.user.id` ownership
- Use `glass` / `glass-hover` utility classes (defined in globals.css)
- Space theme colors: `space-dark (#0a0a1a)`, `space-deeper (#050510)`
- Toast notifications via `sonner` (`toast.success()`, `toast.error()`)
- Icons from `lucide-react`
- Naming convention: Chinese UI copy, English code identifiers

---

## File Structure

```
Modified:
  src/app/api/locations/route.ts              (add pagination + search)
  src/app/api/locations/[id]/route.ts         (add PATCH handler)
  src/components/ui/LeftSidebar.tsx            (wire "个人中心" link)

Created:
  src/app/api/photos/[id]/route.ts            (PATCH + DELETE)
  src/app/api/profile/route.ts                (PATCH user name)
  src/app/profile/page.tsx                     (Server Component)
  src/components/ui/ProfileContent.tsx         (main client container)
  src/components/ui/ProfileHeader.tsx          (name edit + stats)
  src/components/ui/SearchBar.tsx              (debounced search)
  src/components/ui/MemoryList.tsx             (card list + expand)
  src/components/ui/PhotoGrid.tsx              (photo grid in card)
  src/components/ui/Pagination.tsx             (prev/next)
  src/components/ui/EditLocationModal.tsx      (edit location name)
  src/components/ui/EditPhotoModal.tsx         (edit photo metadata)
  src/components/ui/DeleteConfirmModal.tsx     (generic confirm dialog)
```

---

### Task 1: Extend GET /api/locations with pagination + search

**Files:**
- Modify: `src/app/api/locations/route.ts`

**Interfaces:**
- Produces: `GET /api/locations?userId=&page=&limit=&search=` → `{ items: Location[], total: number, page: number, totalPages: number }`

- [ ] **Step 1: Replace the GET handler**

Replace the existing `GET` function in `src/app/api/locations/route.ts`:

```typescript
// GET /api/locations — 获取地点列表（支持分页 + 搜索）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const search = searchParams.get("search") || undefined;

  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  // 没有 userId 且没有 search 时，默认只返回公开地点
  if (!userId && !search) {
    where.isPublic = true;
  }

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      include: {
        _count: { select: { photos: true } },
        photos: {
          orderBy: { createdAt: "desc" },
          select: { id: true, url: true, title: true, description: true, takenAt: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.location.count({ where }),
  ]);

  const pins = items.map((loc) => ({
    id: loc.id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    name: loc.name,
    isPublic: loc.isPublic,
    userId: loc.userId,
    photoCount: loc._count.photos,
    coverUrl: loc.photos[0]?.url || null,
    photoUrls: loc.photos.map((p) => p.url),
    photos: loc.photos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
      createdAt: p.createdAt,
    })),
  }));

  return NextResponse.json({
    items: pins,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

- [ ] **Step 2: Verify with curl**

Run: `npm run dev`

```bash
curl "http://localhost:3000/api/locations?limit=2&page=1"
curl "http://localhost:3000/api/locations?search=东京"
curl "http://localhost:3000/api/locations?userId=YOUR_USER_ID&page=1&limit=5"
```

Expected: Each returns `{ items: [...], total: N, page: N, totalPages: N }`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/locations/route.ts
git commit -m "feat: add pagination and search to GET /api/locations"
```

---

### Task 2: Add PATCH handler to /api/locations/[id]

**Files:**
- Modify: `src/app/api/locations/[id]/route.ts`

**Interfaces:**
- Produces: `PATCH /api/locations/[id]` body `{ name: string }` → updated location with photos

- [ ] **Step 1: Add PATCH export**

Add the following export to `src/app/api/locations/[id]/route.ts` (after the existing DELETE handler):

```typescript
// PATCH /api/locations/[id] — 编辑地点名称
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
  });

  if (!location) {
    return NextResponse.json({ error: "地点不存在" }, { status: 404 });
  }

  if (location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "地点名称不能为空" }, { status: 400 });
  }

  const updated = await prisma.location.update({
    where: { id: params.id },
    data: { name: name.trim() },
    include: {
      _count: { select: { photos: true } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, title: true, description: true, takenAt: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    lat: updated.latitude,
    lng: updated.longitude,
    name: updated.name,
    photoCount: updated._count.photos,
    coverUrl: updated.photos[0]?.url || null,
    photoUrls: updated.photos.map((p) => p.url),
    photos: updated.photos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      description: p.description,
      takenAt: p.takenAt,
      createdAt: p.createdAt,
    })),
  });
}
```

- [ ] **Step 2: Verify**

```bash
curl -X PATCH "http://localhost:3000/api/locations/YOUR_LOCATION_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "新名称测试"}'
```

Expected: 200 with updated location data.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/locations/[id]/route.ts
git commit -m "feat: add PATCH /api/locations/[id] for editing location name"
```

---

### Task 3: Create /api/photos/[id] route (PATCH + DELETE)

**Files:**
- Create: `src/app/api/photos/[id]/route.ts`

**Interfaces:**
- Produces:
  - `PATCH /api/photos/[id]` body `{ title?, description?, takenAt? }` → updated Photo
  - `DELETE /api/photos/[id]` → `{ success: true }`

- [ ] **Step 1: Create the route file**

Create `src/app/api/photos/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/photos/[id] — 编辑照片元数据
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "照片不存在" }, { status: 404 });
  }

  if (photo.location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, takenAt } = body;

  const data: any = {};
  if (title !== undefined) data.title = title || null;
  if (description !== undefined) data.description = description || null;
  if (takenAt !== undefined) data.takenAt = takenAt ? new Date(takenAt) : null;

  const updated = await prisma.photo.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/photos/[id] — 删除照片
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "照片不存在" }, { status: 404 });
  }

  if (photo.location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  await prisma.photo.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify**

```bash
curl -X PATCH "http://localhost:3000/api/photos/YOUR_PHOTO_ID" \
  -H "Content-Type: application/json" \
  -d '{"title": "新标题", "description": "新描述"}'

curl -X DELETE "http://localhost:3000/api/photos/YOUR_PHOTO_ID"
```

Expected: PATCH returns updated photo. DELETE returns `{"success":true}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/photos/[id]/route.ts
git commit -m "feat: add PATCH and DELETE /api/photos/[id]"
```

---

### Task 4: Create /api/profile route (PATCH user name)

**Files:**
- Create: `src/app/api/profile/route.ts`

**Interfaces:**
- Produces: `PATCH /api/profile` body `{ name: string }` → `{ id, name, email, createdAt }`

- [ ] **Step 1: Create the route file**

Create `src/app/api/profile/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/profile — 更新当前用户昵称
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Verify**

```bash
curl -X PATCH "http://localhost:3000/api/profile" \
  -H "Content-Type: application/json" \
  -d '{"name": "新昵称"}'
```

Expected: `{ id, name: "新昵称", email, createdAt }`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/profile/route.ts
git commit -m "feat: add PATCH /api/profile for updating user name"
```

---

### Task 5: Create /app/profile page + ProfileContent shell

**Files:**
- Create: `src/app/profile/page.tsx`
- Create: `src/components/ui/ProfileContent.tsx`

**Interfaces:**
- page.tsx: Server Component, calls `auth()`, redirects if unauthenticated, passes `session.user` to ProfileContent
- ProfileContent: `user: { id?, name?, email? }`, manages page state, fetches data via useEffect

- [ ] **Step 1: Create the Server Component page**

Create `src/app/profile/page.tsx`:

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/ui/ProfileContent";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-space-deeper">
      {/* 星空背景渐变 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <ProfileContent user={session.user} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create ProfileContent shell**

Create `src/components/ui/ProfileContent.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ProfileHeader } from "./ProfileHeader";
import { SearchBar } from "./SearchBar";
import { MemoryList } from "./MemoryList";
import { Pagination } from "./Pagination";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

interface LocationItem {
  id: string;
  lat: number;
  lng: number;
  name: string;
  photoCount: number;
  coverUrl: string | null;
  photoUrls: string[];
  photos: PhotoItem[];
}

interface UserProp {
  id?: string;
  name?: string | null;
  email?: string | null;
}

const PAGE_SIZE = 12;

export function ProfileContent({ user: initialUser }: { user: UserProp }) {
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/locations?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error("加载记忆失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [user.id, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  const onUpdate = () => fetchData();

  return (
    <div className="space-y-6">
      <ProfileHeader
        user={user}
        onUserUpdate={(updated) =>
          setUser((prev) => ({ ...prev, ...updated }))
        }
        totalLocations={total}
        totalPhotos={items.reduce((sum, item) => sum + item.photoCount, 0)}
      />

      <SearchBar value={search} onChange={handleSearch} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-16 bg-white/5 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 text-lg">
            {search.trim()
              ? "没有匹配的记忆"
              : "还没有旅行记忆，去地球添加一个吧 🌍"}
          </p>
          {!search.trim() && (
            <a
              href="/"
              className="inline-block mt-4 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              返回地球
            </a>
          )}
        </div>
      ) : (
        <>
          <MemoryList
            items={items}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId((prev) => (prev === id ? null : id))
            }
            onUpdate={onUpdate}
          />

          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, navigate to `http://localhost:3000/profile`.
Expected: Logged-in users see the page with skeleton → data. Unauthenticated users redirect to /signin.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx src/components/ui/ProfileContent.tsx
git commit -m "feat: create /profile page route and ProfileContent shell"
```

---

### Task 6: Build ProfileHeader with inline name editing

**Files:**
- Create: `src/components/ui/ProfileHeader.tsx`

**Interfaces:**
- Props: `user: UserProp`, `onUserUpdate: (u: Partial<UserProp>) => void`, `totalLocations: number`, `totalPhotos: number`

- [ ] **Step 1: Create ProfileHeader**

Create `src/components/ui/ProfileHeader.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Pencil, Check, X, Mail, MapPin, Image } from "lucide-react";
import { toast } from "sonner";

interface UserProp {
  id?: string;
  name?: string | null;
  email?: string | null;
}

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
                className="text-white/30 hover:text-blue-400 transition-colors p-1"
                title="编辑昵称"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-white/40">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user.email || "未知邮箱"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
            <MapPin className="w-3.5 h-3.5" />
            足迹地点
          </div>
          <p className="text-2xl font-bold text-white">{totalLocations}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
            <Image className="w-3.5 h-3.5" />
            旅行照片
          </div>
          <p className="text-2xl font-bold text-white">{totalPhotos}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `/profile`, verify:
- Name displays with edit icon, clicking shows input with save/cancel
- Enter saves, Escape cancels
- Stats cards show correct numbers

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ProfileHeader.tsx
git commit -m "feat: add ProfileHeader with inline name editing and stats"
```

---

### Task 7: Build SearchBar + Pagination

**Files:**
- Create: `src/components/ui/SearchBar.tsx`
- Create: `src/components/ui/Pagination.tsx`

**Interfaces:**
- SearchBar: `value: string, onChange: (q: string) => void`
- Pagination: `page: number, totalPages: number, onPageChange: (p: number) => void`

- [ ] **Step 1: Create SearchBar**

Create `src/components/ui/SearchBar.tsx`:

```typescript
"use client";

import { useRef, useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (q: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 300);
  };

  const handleClear = () => {
    setLocal("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="搜索地点名称..."
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Pagination**

Create `src/components/ui/Pagination.tsx`:

```typescript
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        上一页
      </button>

      <span className="text-sm text-white/40">
        {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
      >
        下一页
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

- Type in search bar → after 300ms, list refreshes
- Clear button resets search immediately
- Pagination shows when total > 12 items, prev/next disabled at boundaries

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SearchBar.tsx src/components/ui/Pagination.tsx
git commit -m "feat: add SearchBar and Pagination components"
```

---

### Task 8: Build MemoryList + MemoryCard + PhotoGrid + PhotoItem

**Files:**
- Create: `src/components/ui/MemoryList.tsx`
- Create: `src/components/ui/PhotoGrid.tsx`

**Interfaces:**
- MemoryList: `items: LocationItem[], expandedId: string | null, onToggleExpand: (id: string) => void, onUpdate: () => void`
- PhotoGrid: `photos: PhotoItem[], locationName: string, onUpdate: () => void`
- Each MemoryCard manages its own edit/delete modal state internally

- [ ] **Step 1: Create MemoryList**

Create `src/components/ui/MemoryList.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Trash2, MapPin, Image } from "lucide-react";
import { PhotoGrid } from "./PhotoGrid";
import { EditLocationModal } from "./EditLocationModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

interface LocationItem {
  id: string;
  lat: number;
  lng: number;
  name: string;
  photoCount: number;
  coverUrl: string | null;
  photoUrls: string[];
  photos: PhotoItem[];
}

function MemoryCard({
  item,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  item: LocationItem;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="glass overflow-hidden transition-all">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
          onClick={onToggle}
        >
          <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-white/5">
            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <Image className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <h3 className="text-white font-medium truncate text-sm">
                {item.name}
              </h3>
            </div>
            <p className="text-white/40 text-xs mt-1">
              {item.photoCount} 张照片
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(true);
              }}
              className="p-1.5 text-white/30 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
              title="编辑名称"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDelete(true);
              }}
              className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
              title="删除地点"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronDown
              className={`w-4 h-4 text-white/30 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {isExpanded && item.photos.length > 0 && (
          <div className="border-t border-white/5 px-4 pb-4 pt-3">
            <PhotoGrid
              photos={item.photos}
              locationName={item.name}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>

      {showEdit && (
        <EditLocationModal
          locationId={item.id}
          currentName={item.name}
          onUpdated={() => {
            onUpdate();
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirmModal
          targetId={item.id}
          targetType="location"
          targetName={item.name}
          onDeleted={() => {
            onUpdate();
            setShowDelete(false);
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

export function MemoryList({
  items,
  expandedId,
  onToggleExpand,
  onUpdate,
}: {
  items: LocationItem[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MemoryCard
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggleExpand(item.id)}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create PhotoGrid**

Create `src/components/ui/PhotoGrid.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EditPhotoModal } from "./EditPhotoModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

function PhotoCard({
  photo,
  onUpdate,
}: {
  photo: PhotoItem;
  onUpdate: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden bg-white/5 aspect-[4/3]">
        <img
          src={photo.url}
          alt={photo.title || ""}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="编辑"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-red-500/60 text-white transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {photo.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">{photo.title}</p>
          </div>
        )}
      </div>

      {showEdit && (
        <EditPhotoModal
          photo={photo}
          onUpdated={() => {
            onUpdate();
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirmModal
          targetId={photo.id}
          targetType="photo"
          targetName={photo.title || "照片"}
          onDeleted={() => {
            onUpdate();
            setShowDelete(false);
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

export function PhotoGrid({
  photos,
  locationName,
  onUpdate,
}: {
  photos: PhotoItem[];
  locationName: string;
  onUpdate: () => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/profile`, verify:
- Location cards display cover image, name, photo count
- Click card → expands with photo grid, chevron rotates
- Click another card → first collapses (accordion)
- Hover photo → overlay with edit/delete buttons appears

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/MemoryList.tsx src/components/ui/PhotoGrid.tsx
git commit -m "feat: add MemoryList with expandable cards and PhotoGrid"
```

---

### Task 9: Build modal components (EditLocation, EditPhoto, DeleteConfirm)

**Files:**
- Create: `src/components/ui/EditLocationModal.tsx`
- Create: `src/components/ui/EditPhotoModal.tsx`
- Create: `src/components/ui/DeleteConfirmModal.tsx`

**Interfaces:**
- EditLocationModal: `locationId: string, currentName: string, onUpdated: () => void, onClose: () => void`
- EditPhotoModal: `photo: PhotoItem, onUpdated: () => void, onClose: () => void`
- DeleteConfirmModal: `targetId: string, targetType: "location" | "photo", targetName: string, onDeleted: () => void, onClose: () => void`

- [ ] **Step 1: Create EditLocationModal**

Create `src/components/ui/EditLocationModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { toast } from "sonner";

export function EditLocationModal({
  locationId,
  currentName,
  onUpdated,
  onClose,
}: {
  locationId: string;
  currentName: string;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("地点名称不能为空");
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      toast.success("地点名称已更新");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-400" />
            编辑地点名称
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            autoFocus
          />

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create EditPhotoModal**

Create `src/components/ui/EditPhotoModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

export function EditPhotoModal({
  photo,
  onUpdated,
  onClose,
}: {
  photo: PhotoItem;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(photo.title || "");
  const [description, setDescription] = useState(photo.description || "");
  const [takenAt, setTakenAt] = useState(
    photo.takenAt ? photo.takenAt.split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          takenAt: takenAt || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      toast.success("照片信息已更新");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            编辑照片信息
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 预览 */}
          <div className="rounded-lg overflow-hidden bg-white/5 aspect-video">
            <img
              src={photo.url}
              alt={photo.title || ""}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="照片标题（可选）"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="照片描述（可选）"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors resize-none"
            />
          </div>

          {/* 拍摄日期 */}
          <div>
            <label className="block text-xs text-white/40 mb-1">拍摄日期</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create DeleteConfirmModal**

Create `src/components/ui/DeleteConfirmModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const API_MAP: Record<string, string> = {
  location: "/api/locations",
  photo: "/api/photos",
};

const LABEL_MAP: Record<string, string> = {
  location: "地点",
  photo: "照片",
};

export function DeleteConfirmModal({
  targetId,
  targetType,
  targetName,
  onDeleted,
  onClose,
}: {
  targetId: string;
  targetType: "location" | "photo";
  targetName: string;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_MAP[targetType]}/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "删除失败");
      }
      toast.success(`已删除${LABEL_MAP[targetType]}`);
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || "删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            确认删除
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-white/60 text-sm">
            确认删除{LABEL_MAP[targetType]}「
            <span className="text-white font-medium">{targetName}</span>
            」？此操作不可撤销
            {targetType === "location" && "，该地点下的所有照片也将被删除"}
            。
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {deleting ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Test each modal:
- Edit location name → save → list updates, toast "地点名称已更新"
- Edit photo → save → list updates, toast "照片信息已更新"
- Delete photo → confirm → list updates, toast "已删除照片"
- Delete location → confirm → list updates, toast "已删除地点"
- Cancel on each modal → closes without action

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/EditLocationModal.tsx src/components/ui/EditPhotoModal.tsx src/components/ui/DeleteConfirmModal.tsx
git commit -m "feat: add EditLocation, EditPhoto, and DeleteConfirm modals"
```

---

### Task 10: Wire up LeftSidebar "个人中心" to navigate to /profile

**Files:**
- Modify: `src/components/ui/LeftSidebar.tsx`

- [ ] **Step 1: Add Link to "个人中心" button**

In `src/components/ui/LeftSidebar.tsx`, replace the logged-in "个人中心" button (currently a no-op `<button>`) with a Next.js Link:

At the top, add the import:
```typescript
import Link from "next/link";
```

Then find the logged-in user section (~line 97-103) and replace:
```typescript
{user ? (
  <button
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all"
  >
    <User className="w-4 h-4" />
    {user.name || "旅行者"}
  </button>
) : (
```

With:
```typescript
{user ? (
  <Link
    href="/profile"
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-sm transition-all no-underline"
  >
    <User className="w-4 h-4" />
    {user.name || "旅行者"}
  </Link>
) : (
```

- [ ] **Step 2: Verify**

Navigate to `/`, click "个人中心" in the sidebar → navigates to `/profile`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LeftSidebar.tsx
git commit -m "feat: wire LeftSidebar '个人中心' to /profile"
```

---

### Task 11: Integration test — full flow walkthrough

- [ ] **Step 1: Run the dev server and test end-to-end**

```bash
npm run dev
```

Walk through:
1. Visit `/` → click sidebar "个人中心" → arrive at `/profile`
2. Verify name, email, stats display correctly
3. Edit name → save → verify toast + display update
4. Search for a location by name → list filters
5. Clear search → full list returns
6. Expand a location card → photo grid shows
7. Edit a photo's title/description → save → verify update
8. Delete a photo → confirm → verify removal
9. Edit a location name → save → verify update
10. Delete a location → confirm → verify removal
11. Paginate if > 12 locations
12. Log out → visit `/profile` directly → redirects to `/signin`

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit if changes needed**

```bash
git add -A
git commit -m "chore: integration fixes for profile page"
```
