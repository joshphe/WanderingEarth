# 照片上传限制 & 评论系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增照片上传 50 张上限（环境变量配置化）和旅行记忆评论系统（发表/回复/删除）

**Architecture:** 单一 Comment 表 + parentId 自引用实现评论与回复；照片上限通过 prisma.photo.count 实时计数，前端通过 `/api/profile` 获取配额；CommentPanel 作为独立组件挂载在 MemoryOverlay 右侧

**Tech Stack:** Next.js 14 App Router, Prisma, PostgreSQL, Zustand, TypeScript, TailwindCSS

## Global Constraints

- 照片上限通过 `MAX_PHOTOS_PER_USER` 环境变量配置，默认 50
- 每条评论限制 50 字（`content` 字段 trim 后 1–50 字符）
- 仅记忆 owner 可回复和删除评论；访客仅可发表顶级评论和查看
- 评论按最新优先排列（`createdAt: desc`），子回复按时间正序
- 评论面板在探索模式和自己的记忆页面均显示
- 删除文字按钮，与回复按钮并列（不使用图标）
- spec 文档使用中文纪录
- 所有 API 路由遵循已有鉴权模式：`auth()` → 401 检查 → 所有权校验 → 操作
- 遵循已有代码风格：TailwindCSS 暗色太空主题，sonner toast 毛玻璃暗色，errorResponse/successResponse 工具函数

---

### Task 1: Prisma Schema + 数据库迁移

**Files:**
- Modify: `prisma/schema.prisma` — 新增 Comment 模型 + User/Location 关系

**Interfaces:**
- Consumes: none (first task)
- Produces: `Comment` model with fields `id, content, createdAt, updatedAt, userId, locationId, parentId` + relations to `User`, `Location`, self

- [ ] **Step 1: 在 schema.prisma 中新增 Comment 模型**

在 `prisma/schema.prisma` 的 `InviteCode` 模型之后添加：

```prisma
model Comment {
  id         String    @id @default(cuid())
  content    String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  locationId String
  location   Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  parentId   String?
  parent     Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")

  @@index([locationId])
  @@index([parentId])
  @@index([userId])
  @@map("comments")
}
```

同时在 `User` 模型的字段区域末尾（`locations Location[]` 之后）添加：

```prisma
  comments  Comment[]
```

在 `Location` 模型的字段区域末尾（`photos Photo[]` 之后）添加：

```prisma
  comments  Comment[]
```

- [ ] **Step 2: 运行数据库迁移**

```bash
npx prisma migrate dev --name add_comments
```

预期输出：迁移成功，`comments` 表创建，包含三个索引。

- [ ] **Step 3: 生成 Prisma Client**

```bash
npx prisma generate
```

预期输出：Prisma Client 重新生成，包含 Comment 模型的 CRUD 方法。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Comment model with self-referential replies

- Comment model: id, content, createdAt, userId, locationId, parentId
- Self-referential relation via CommentReplies for nested replies
- Indexes on locationId, parentId, userId
- Cascade delete from User and Location

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 基础设施 — config, types, store

**Files:**
- Create: `src/lib/config.ts`
- Modify: `src/lib/types.ts` — 新增 CommentItem, CommentUser 类型
- Modify: `src/lib/store.ts` — 新增 photoCount, maxPhotos

**Interfaces:**
- Consumes: none
- Produces:
  - `MAX_PHOTOS_PER_USER` (number, from `src/lib/config.ts`)
  - `CommentUser` interface: `{ id, name, image }`
  - `CommentItem` interface: `{ id, content, createdAt, userId, user, parentId, replies }`
  - Store fields: `photoCount: number`, `maxPhotos: number` + setters

- [ ] **Step 1: 创建 `src/lib/config.ts`**

```typescript
/** 每用户照片上传上限，通过环境变量 MAX_PHOTOS_PER_USER 配置，默认 50 */
export const MAX_PHOTOS_PER_USER = parseInt(
  process.env.MAX_PHOTOS_PER_USER || "50",
  10
);
```

- [ ] **Step 2: 在 `src/lib/types.ts` 末尾新增评论类型**

```typescript
/** 评论用户精简信息 */
export interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

/** 评论（含嵌套回复） */
export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: CommentUser;
  parentId: string | null;
  replies: CommentItem[];
}
```

- [ ] **Step 3: 更新 `src/lib/store.ts` — 新增 photoCount / maxPhotos**

在 `EarthStore` interface 的 `dataLoading` 字段之后添加：

```typescript
  // 照片配额
  photoCount: number;
  maxPhotos: number;
  setPhotoCount: (count: number) => void;
  setMaxPhotos: (max: number) => void;
```

在 `create` 回调的返回值对象中添加：

```typescript
  photoCount: 0,
  maxPhotos: 50,
  setPhotoCount: (count) => set({ photoCount: count }),
  setMaxPhotos: (max) => set({ maxPhotos: max }),
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts src/lib/types.ts src/lib/store.ts
git commit -m "feat: add config, comment types, and photo quota store fields

- src/lib/config.ts: MAX_PHOTOS_PER_USER from env var
- src/lib/types.ts: CommentUser, CommentItem interfaces
- src/lib/store.ts: photoCount, maxPhotos with setters

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 照片上限 API 层校验

**Files:**
- Modify: `src/app/api/profile/route.ts` — GET 响应新增 photoCount 和 maxPhotos
- Modify: `src/app/api/memories/route.ts` — POST 创建前检查总数
- Modify: `src/app/api/locations/[id]/photos/route.ts` — POST 添加前检查总数

**Interfaces:**
- Consumes: `MAX_PHOTOS_PER_USER` from `src/lib/config.ts`, store types from Task 2
- Produces: `GET /api/profile` returns `{ ..., photoCount, maxPhotos }`; photo creation endpoints return 400 when limit exceeded

- [ ] **Step 1: 更新 `GET /api/profile` — 返回 photoCount 和 maxPhotos**

修改 `src/app/api/profile/route.ts` 中的 `GET` 函数。

在 `select` 查询后、`return` 之前，新增 photo 计数查询。将函数末尾的：

```typescript
  return NextResponse.json(user, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
```

改为：

```typescript
  const photoCount = await prisma.photo.count({
    where: { location: { userId: session.user.id } },
  });

  const { MAX_PHOTOS_PER_USER } = await import("@/lib/config");

  return NextResponse.json(
    { ...user, photoCount, maxPhotos: MAX_PHOTOS_PER_USER },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    }
  );
```

注意：`import` 放在函数内部是为了与已有的顶层 `auth` / `prisma` import 保持分离。如果顶层已有其他 import from `@/lib/config`，改为顶层 import。

- [ ] **Step 2: 更新 `POST /api/memories` — 创建前检查照片总数**

修改 `src/app/api/memories/route.ts`。

在文件顶部的 import 区域添加：

```typescript
import { MAX_PHOTOS_PER_USER } from "@/lib/config";
```

在 `POST` 函数中，`body.photoUrl` 单张回退逻辑之后、`!locationName || !latitude...` 校验之前，插入照片计数校验：

```typescript
  // 照片上限校验
  const existingPhotoCount = await prisma.photo.count({
    where: { location: { userId: session.user.id } },
  });
  const newPhotoCount = photosInput.length;
  if (existingPhotoCount + newPhotoCount > MAX_PHOTOS_PER_USER) {
    return errorResponse(
      `照片已达上限（${MAX_PHOTOS_PER_USER}张），请删除旧照片后再添加`,
      400
    );
  }
```

- [ ] **Step 3: 更新 `POST /api/locations/[id]/photos` — 添加前检查照片总数**

修改 `src/app/api/locations/[id]/photos/route.ts`。

在文件顶部的 import 区域添加：

```typescript
import { MAX_PHOTOS_PER_USER } from "@/lib/config";
```

在 `!url` 校验之前、所有权校验之后，插入照片计数校验：

```typescript
  // 照片上限校验
  const photoCount = await prisma.photo.count({
    where: { location: { userId: session.user.id } },
  });
  if (photoCount >= MAX_PHOTOS_PER_USER) {
    return NextResponse.json(
      { error: `照片已达上限（${MAX_PHOTOS_PER_USER}张），请删除旧照片后再添加` },
      { status: 400 }
    );
  }
```

当前路由中无同名变量冲突，新校验变量名 `photoCount` 可直接使用。

- [ ] **Step 4: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/app/api/memories/route.ts src/app/api/locations/\[id\]/photos/route.ts
git commit -m "feat: add photo upload limit check at API layer

- GET /api/profile: response includes photoCount and maxPhotos
- POST /api/memories: reject if existing + new > MAX_PHOTOS_PER_USER
- POST /api/locations/[id]/photos: reject if count >= MAX_PHOTOS_PER_USER

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 照片上限前端展示

**Files:**
- Modify: `src/components/ui/DataLoader.tsx` — 加载时将 photoCount/maxPhotos 写入 store
- Modify: `src/components/ui/AddMemoryModal.tsx` — 展示配额 + 达上限禁用
- Modify: `src/components/ui/AddPhotoModal.tsx` — 展示配额 + 达上限禁用

**Interfaces:**
- Consumes: Store `photoCount`, `maxPhotos`, `setPhotoCount`, `setMaxPhotos` from Task 2; API response changes from Task 3
- Produces: UI showing "已上传 X/50 张 · 还可上传 Y 张", upload disabled when full

- [ ] **Step 1: 更新 DataLoader — 写入 photoCount 和 maxPhotos 到 store**

修改 `src/components/ui/DataLoader.tsx`。

从 store 中取出 setter：

```typescript
  const setPhotoCount = useEarthStore((s) => s.setPhotoCount);
  const setMaxPhotos = useEarthStore((s) => s.setMaxPhotos);
```

在 `useEffect` 的 `fetchLocations` 函数中，`setDataLoading(false)` 之前添加 profile fetch：

```typescript
        // 加载照片配额
        try {
          const profileRes = await fetch("/api/profile");
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setPhotoCount(profile.photoCount ?? 0);
            setMaxPhotos(profile.maxPhotos ?? 50);
          }
        } catch {
          // 静默失败，不影响主流程
        }
```

- [ ] **Step 2: 更新 AddMemoryModal — 展示配额**

修改 `src/components/ui/AddMemoryModal.tsx`。

在组件顶部，从 store 读取配额：

```typescript
  const photoCount = useEarthStore((s) => s.photoCount);
  const maxPhotos = useEarthStore((s) => s.maxPhotos);
```

在 `<PhotoUploader photos={photos} onPhotosChange={setPhotos} />` 之前添加配额提示：

```tsx
          {/* 照片配额提示 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">
              已上传 {photoCount}/{maxPhotos} 张
              {photoCount < maxPhotos && (
                <span className="text-white/25"> · 还可上传 {maxPhotos - photoCount} 张</span>
              )}
            </span>
            {photoCount >= maxPhotos && (
              <span className="text-amber-400/80">已达上限</span>
            )}
          </div>
```

提交按钮的 `disabled` 条件中增加配额检查：在已有条件之后加上：

```typescript
            disabled={
              submitting ||
              !locationName.trim() ||
              !selectedCoords ||
              !photos.some((p) => p.url.trim()) ||
              photoCount >= maxPhotos
            }
```

当 `photoCount >= maxPhotos` 时，按钮文字改为提示：在提交按钮的 JSX 中，将：

```tsx
            {submitting ? "添加中..." : "添加到地球"}
```

改为：

```tsx
            {submitting
              ? "添加中..."
              : photoCount >= maxPhotos
              ? "照片已达上限，请删除旧照片后再添加"
              : "添加到地球"}
```

- [ ] **Step 3: 更新 AddPhotoModal — 展示配额**

修改 `src/components/ui/AddPhotoModal.tsx`。

Props 中读取 store 配额（组件内部从 useEarthStore 读取）：

```typescript
  const photoCount = useEarthStore((s) => s.photoCount);
  const maxPhotos = useEarthStore((s) => s.maxPhotos);
```

在 "添加照片到 {locationName}" 标题下方，照片列表之前添加配额提示：

```tsx
          {/* 照片配额提示 */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-white/40">
              已上传 {photoCount}/{maxPhotos} 张
              {photoCount < maxPhotos && (
                <span className="text-white/25"> · 还可上传 {maxPhotos - photoCount} 张</span>
              )}
            </span>
            {photoCount >= maxPhotos && (
              <span className="text-amber-400/80">已达上限</span>
            )}
          </div>
```

「选择文件」按钮和「添加更多照片」按钮增加 disabled 判断，当 `photoCount >= maxPhotos` 时禁用。修改「选择文件」按钮的 `disabled` 属性：

```tsx
                    disabled={uploadingIndex === i || photoCount >= maxPhotos}
```

修改「添加更多照片」按钮：

```tsx
            disabled={photoCount >= maxPhotos}
```

底部「添加」按钮的 disabled 增加判断：

```tsx
              disabled={
                saving || !photos.some((p) => p.url.trim()) || photoCount >= maxPhotos
              }
```

当配额满时按钮文字显示提示：

```tsx
              {saving
                ? "添加中..."
                : photoCount >= maxPhotos
                ? "已达上限"
                : "添加"}
```

- [ ] **Step 4: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/DataLoader.tsx src/components/ui/AddMemoryModal.tsx src/components/ui/AddPhotoModal.tsx
git commit -m "feat: show photo quota in upload modals, disable when full

- DataLoader fetches /api/profile to populate photoCount/maxPhotos in store
- AddMemoryModal shows quota indicator and disables submit when full
- AddPhotoModal shows quota indicator and disables upload when full

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 评论 API — GET 列表 + POST 发表

**Files:**
- Create: `src/app/api/locations/[id]/comments/route.ts`

**Interfaces:**
- Consumes: `Comment` model from Task 1, `errorResponse`/`successResponse` from `src/lib/api-utils.ts`
- Produces:
  - `GET /api/locations/[id]/comments` → `{ comments: CommentItem[] }`
  - `POST /api/locations/[id]/comments` → `CommentItem` (201)

- [ ] **Step 1: 创建 `src/app/api/locations/[id]/comments/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations/[id]/comments — 获取某条记忆的所有评论
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    select: { id: true, isPublic: true, userId: true },
  });

  if (!location) {
    return errorResponse("记忆不存在", 404);
  }

  // 非公开记忆仅 owner 可查看评论
  if (!location.isPublic && location.userId !== session.user.id) {
    return errorResponse("无权查看", 403);
  }

  const comments = await prisma.comment.findMany({
    where: { locationId: params.id, parentId: null },
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({ comments });
}

// POST /api/locations/[id]/comments — 发表评论或回复
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, isPublic: true },
  });

  if (!location) {
    return errorResponse("记忆不存在", 404);
  }

  // 只能对公开记忆发评论
  if (!location.isPublic) {
    return errorResponse("该记忆未公开，无法评论", 400);
  }

  const body = await request.json();
  const { content, parentId } = body;

  // 内容校验
  if (!content || typeof content !== "string" || !content.trim()) {
    return errorResponse("评论内容不能为空", 400);
  }
  if (content.trim().length > 50) {
    return errorResponse("评论不能超过50字", 400);
  }

  const isOwner = location.userId === session.user.id;

  // 仅 owner 可回复（传 parentId）
  if (parentId && !isOwner) {
    return errorResponse("无权操作", 403);
  }

  // 校验 parentId 引用的评论存在且属于同一 location
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, locationId: true },
    });
    if (!parentComment) {
      return errorResponse("该评论不存在", 404);
    }
    if (parentComment.locationId !== params.id) {
      return errorResponse("评论不属于该记忆", 400);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      locationId: params.id,
      parentId: parentId || null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return successResponse(comment, 201);
}
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/locations/\[id\]/comments/route.ts
git commit -m "feat: add GET and POST /api/locations/[id]/comments

- GET: returns comments with nested replies, newest first
- POST: create comment/reply, 50-char limit, owner-only reply

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 评论 API — DELETE 删除

**Files:**
- Create: `src/app/api/comments/[id]/route.ts`

**Interfaces:**
- Consumes: `Comment` model from Task 1, `errorResponse`/`successResponse` from `src/lib/api-utils.ts`
- Produces: `DELETE /api/comments/[id]` → `{ deleted: true }`

- [ ] **Step 1: 创建 `src/app/api/comments/[id]/route.ts`**

```typescript
import { errorResponse, successResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 递归收集评论及其所有子孙评论的 ID */
async function collectDescendantIds(commentId: string): Promise<string[]> {
  const children = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });

  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const grandchildIds = await collectDescendantIds(child.id);
    ids.push(...grandchildIds);
  }
  return ids;
}

// DELETE /api/comments/[id] — 删除评论及其所有子回复（仅 memory owner）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    include: {
      location: { select: { userId: true } },
    },
  });

  if (!comment) {
    return errorResponse("评论不存在", 404);
  }

  // 仅 memory owner 可删除评论
  if (comment.location.userId !== session.user.id) {
    return errorResponse("无权操作", 403);
  }

  // 递归收集所有子孙评论 ID
  const descendantIds = await collectDescendantIds(params.id);

  // 批量删除：目标评论 + 所有子孙评论
  const allIds = [params.id, ...descendantIds];
  await prisma.comment.deleteMany({
    where: { id: { in: allIds } },
  });

  return successResponse({ deleted: true });
}
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/comments/\[id\]/route.ts
git commit -m "feat: add DELETE /api/comments/[id] with recursive cascade

- Only memory owner can delete comments
- Recursively collects and deletes all descendant replies

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: CommentPanel 组件

**Files:**
- Create: `src/components/ui/CommentPanel.tsx`

**Interfaces:**
- Consumes: `CommentItem` type from Task 2; `GET`/`POST`/`DELETE` APIs from Tasks 5–6; `LoadingState`, `EmptyState`, `ErrorState`; `MessageCircle` icon from lucide-react; store `exploreUserId`
- Produces: `<CommentPanel locationId isOwner onClose />` component

- [ ] **Step 1: 创建 `src/components/ui/CommentPanel.tsx`**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEarthStore } from "@/lib/store";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import type { CommentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_COMMENT_LENGTH = 50;

interface CommentPanelProps {
  locationId: string;
  isOwner: boolean;
  onClose?: () => void;
}

/** 格式化相对时间 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "刚刚";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export function CommentPanel({ locationId, isOwner, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 正在回复的评论 ID（null = 顶级评论输入框）
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const exploreUserId = useEarthStore((s) => s.exploreUserId);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      } else {
        const err = await res.json();
        setError(err.error || "加载评论失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 发表顶级评论
  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    if (content.trim().length > MAX_COMMENT_LENGTH) {
      toast.error(`评论不能超过${MAX_COMMENT_LENGTH}字`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        toast.success("评论已发表");
      } else {
        const err = await res.json();
        toast.error(err.error || "发表失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 发表回复
  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;
    if (replyContent.trim().length > MAX_COMMENT_LENGTH) {
      toast.error(`回复不能超过${MAX_COMMENT_LENGTH}字`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...c.replies, newReply] }
              : c
          )
        );
        setReplyContent("");
        setReplyToId(null);
        toast.success("回复已发表");
      } else {
        const err = await res.json();
        toast.error(err.error || "回复失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm("确定删除这条评论吗？子回复也会一并删除。")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success("评论已删除");
      } else {
        const err = await res.json();
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    }
  };

  return (
    <div className="flex flex-col w-[300px] h-full border-l border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          评论 ({comments.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && <LoadingState size="sm" message="加载评论..." />}
        {error && <ErrorState message={error} onRetry={fetchComments} />}
        {!loading && !error && comments.length === 0 && (
          <EmptyState message="暂无评论，来写第一条吧 ✨" />
        )}
        {!loading &&
          !error &&
          comments.map((comment) => (
            <div key={comment.id} className="space-y-1.5">
              {/* 顶级评论 */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/60">
                    {comment.user.name || "未知用户"}
                  </span>
                  <span className="text-[10px] text-white/25">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-white/70 mt-0.5 leading-relaxed">
                  {comment.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-[11px] text-white/30 hover:text-red-400 transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() =>
                          setReplyToId(
                            replyToId === comment.id ? null : comment.id
                          )
                        }
                        className="text-[11px] text-white/30 hover:text-blue-400 transition-colors"
                      >
                        回复
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 子回复 */}
              {comment.replies.length > 0 && (
                <div className="ml-5 pl-2 border-l border-white/10 space-y-1.5">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white/50">
                          {reply.user.name || "未知用户"}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {timeAgo(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
                        {reply.content}
                      </p>
                      {isOwner && (
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="text-[11px] text-white/30 hover:text-red-400 transition-colors mt-0.5"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 回复输入框 */}
              {replyToId === comment.id && (
                <div className="ml-5 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写下回复..."
                      maxLength={MAX_COMMENT_LENGTH}
                      disabled={submitting}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(comment.id);
                        }
                      }}
                    />
                    <span className="text-[10px] text-white/20 shrink-0">
                      {replyContent.length}/{MAX_COMMENT_LENGTH}
                    </span>
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyContent.trim() || submitting}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
                    >
                      {submitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* 底部输入区 */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下评论..."
            maxLength={MAX_COMMENT_LENGTH}
            disabled={submitting}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="text-[10px] text-white/20 shrink-0">
            {content.length}/{MAX_COMMENT_LENGTH}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/CommentPanel.tsx
git commit -m "feat: add CommentPanel component

- Displays comments with nested replies, newest first
- Owner can reply and delete; visitors can only post top-level
- 50-char limit with counter, loading/empty/error states
- Inline reply input, Enter to submit

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: MemoryOverlay 集成 CommentPanel

**Files:**
- Modify: `src/components/ui/MemoryOverlay.tsx` — 左右分栏布局 + 集成 CommentPanel

**Interfaces:**
- Consumes: `CommentPanel` from Task 7; store `exploreUserId`; existing `ExpandedMemory`/`pin` types
- Produces: Two-column MemoryOverlay with photos left + CommentPanel right, `isOwner` from `exploreUserId === null`

- [ ] **Step 1: 修改 MemoryOverlay 布局为左右分栏**

修改 `src/components/ui/MemoryOverlay.tsx`。

在文件顶部 import 区域添加：

```typescript
import { useState } from "react";
import { CommentPanel } from "./CommentPanel";
import { MessageCircle } from "lucide-react";
```

在组件内部的 hooks 区域（`const prefersReducedMotion` 之后）添加：

```typescript
  const exploreUserId = useEarthStore((s) => s.exploreUserId);
  const isOwner = exploreUserId === null;
  const [commentPanelOpen, setCommentPanelOpen] = useState(true);
```

将现有的 return 内容（`<div className="absolute inset-0 z-[9999]...`）中的整个结构改为左右分栏。

**关键改动：** 将现有的 `.pointer-events-auto` 内容替换为：

```tsx
  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />

      {/* 左右分栏主体 */}
      <div className="relative pointer-events-auto flex items-stretch w-full max-w-[96vw] max-h-[96vh]">
        {/* 左侧：照片区（同原来结构，去掉最外层 pointer-events-auto div） */}
        <div className="flex flex-col items-center flex-1 min-w-0 pt-4 pb-4">
          {/* ... 原来的照片卡片墙 + 工具栏 + 详情 ... */}
        </div>

        {/* 右侧：评论面板 */}
        <CommentPanel
          locationId={pin.id}
          isOwner={isOwner}
          onClose={() => setCommentPanelOpen(false)}
        />
      </div>

      {/* 收起评论面板时的重新打开按钮 */}
      {!commentPanelOpen && (
        <button
          onClick={() => setCommentPanelOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[10001] pointer-events-auto
            glass rounded-full p-2.5 text-white/40 hover:text-white/70 transition-all
            border border-white/10 hover:border-white/20"
          title="打开评论"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
```

**具体整合步骤（精确替换）：**

修改 `src/components/ui/MemoryOverlay.tsx`：

1. 顶部 import 加 `import { useState } from "react";`（将 `React, { useState, useCallback, useEffect, useMemo, useRef }` 改为 `React, { useState, useCallback, useEffect, useMemo, useRef }` — 已有 `useState`）

2. 在 import 区域末尾添加：
```typescript
import { CommentPanel } from "./CommentPanel";
import { MessageCircle } from "lucide-react";
```

注意 `MessageCircle` 需要从 lucide-react 导入。检查现有 import 是否已从 lucide-react 导入 `MessageCircle`，如果没有，在已有的 `import { X, MapPin, Calendar } from "lucide-react";` 中加入。

3. 在组件 hooks 区域（`const prefersReducedMotion = useReducedMotion();` 之后）添加：
```typescript
  const exploreUserId = useEarthStore((s) => s.exploreUserId);
  const isOwner = exploreUserId === null;
  const [commentPanelOpen, setCommentPanelOpen] = useState(true);
```

4. 将 return 语句中的最外层结构重写。原有结构是：
```
<div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
  <div className="absolute inset-0 bg-black/55... pointer-events-auto" onClick={handleClose} />
  <div className="relative pointer-events-auto flex flex-col items-center w-full max-w-[96vw] max-h-[96vh]">
    [工具栏]
    [照片散落区]
    [圆点指示器]
    [详细信息]
  </div>
</div>
```

改为：
```
<div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none">
  <div className="absolute inset-0 bg-black/55... pointer-events-auto" onClick={handleClose} />
  <div className="relative pointer-events-auto flex items-stretch w-full max-w-[96vw] max-h-[96vh]">
    <div className="flex flex-col items-center flex-1 min-w-0">
      [工具栏 — 同一内容]
      [照片散落区 — 同一内容]
      [圆点指示器 — 同一内容]
      [详细信息 — 同一内容]
    </div>
    {commentPanelOpen && (
      <CommentPanel
        locationId={pin.id}
        isOwner={isOwner}
        onClose={() => setCommentPanelOpen(false)}
      />
    )}
  </div>
  {!commentPanelOpen && (
    <button
      onClick={() => setCommentPanelOpen(true)}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-[10001] pointer-events-auto
        glass rounded-full p-2.5 text-white/40 hover:text-white/70 transition-all
        border border-white/10 hover:border-white/20"
      title="打开评论"
    >
      <MessageCircle className="w-4 h-4" />
    </button>
  )}
</div>
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MemoryOverlay.tsx
git commit -m "feat: integrate CommentPanel into MemoryOverlay

- Two-column layout: photos left + comments right
- isOwner derived from exploreUserId === null
- Panel can be toggled closed, re-open button appears
- MessageCircle icon from lucide-react

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 环境变量 & 最终验证

**Files:**
- Modify: `.env.example` — 新增 MAX_PHOTOS_PER_USER
- Modify: `.env` — 新增 MAX_PHOTOS_PER_USER（如尚未存在）

**Interfaces:**
- Consumes: `MAX_PHOTOS_PER_USER` config from all previous tasks
- Produces: updated `.env.example` with new variable; full build verification

- [ ] **Step 1: 更新 `.env.example`**

在 `.env.example` 末尾（`NEXT_PUBLIC_APP_URL` 之后）添加：

```env
# 每用户照片上传上限（默认 50）
MAX_PHOTOS_PER_USER=50
```

- [ ] **Step 2: 更新 `.env`**

```bash
if ! grep -q "MAX_PHOTOS_PER_USER" .env; then
  echo "" >> .env
  echo "# 每用户照片上传上限（默认 50）" >> .env
  echo "MAX_PHOTOS_PER_USER=50" >> .env
fi
```

- [ ] **Step 3: 完整 TypeScript 编译检查**

```bash
npx tsc --noEmit
```

预期输出：无类型错误。

- [ ] **Step 4: Next.js 构建验证**

```bash
npx next build 2>&1 | tail -20
```

预期输出：构建成功，无错误。可能有一些 warning（如 Image 优化等），可忽略。

- [ ] **Step 5: Prisma 验证**

```bash
npx prisma validate
```

预期输出：schema 验证通过。

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "chore: add MAX_PHOTOS_PER_USER to .env.example

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 验证清单

完成所有任务后，手动验证以下场景：

1. **照片上限 API 拦截：** 上传第 51 张照片时 API 返回 400 + Toast 提示
2. **照片上限前端拦截：** 配额满时 AddMemoryModal / AddPhotoModal 上传按钮禁用
3. **配额实时更新：** 删除照片后再上传，配额恢复
4. **发表评论：** 在探索模式下打开他人记忆，发表顶级评论成功
5. **回复评论：** owner 看自己记忆时可回复，非 owner 不可回复
6. **删除评论：** owner 可删除任意评论（含级联删除子回复），访客无删除按钮
7. **50 字限制：** 输入超过 50 字时前端禁用 + API 返回 400
8. **评论排序：** 最新评论在最上面
9. **评论面板折叠：** 折叠/展开功能正常
10. **环境变量配置：** 修改 MAX_PHOTOS_PER_USER 后重启，上限生效
