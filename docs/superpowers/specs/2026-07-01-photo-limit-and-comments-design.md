# Photo Upload Limit & Comments System — Design Spec

**Date:** 2026-07-01
**Status:** Approved

---

## Overview

Two new features for Wandering Earth (流浪地球):

1. **Photo upload limit**: Each user is limited to 50 travel memory photos total. Exceeding the limit is blocked at both the API and UI levels.
2. **Comments system**: Users can leave text comments on travel memories (Location). The memory owner can reply to and delete comments.

---

## Feature 1: Photo Upload Limit (50 per user)

### Rules

- Per-user total across ALL locations: max **50 photos**
- Dual enforcement: frontend shows remaining quota + disables upload; API does final validation
- Count is real-time — deleting old photos frees up quota immediately

### Data Layer

No schema changes needed. Photo count is queried via existing relations:

```
prisma.photo.count({ where: { location: { userId } } })
```

### API Layer

**Modified routes:**

| Route | Change |
|---|---|
| `POST /api/memories` | Before creating photos: `existingCount + newCount > 50` → 400 "照片已达上限（50张），请删除旧照片后再添加" |
| `POST /api/locations/[id]/photos` | Same check per-add |
| `GET /api/profile` | Response gains `photoCount` field for frontend quota display |

**Batch rejection:** If a single request would push the total over 50, the entire batch is rejected (atomic).

### Frontend

**Store (`src/lib/store.ts`):**
- New fields: `photoCount: number`, `maxPhotos: number` (default 50)

**AddMemoryModal & AddPhotoModal:**
- Display quota indicator above photo upload area:
  ```
  已上传 42/50 张 · 还可上传 8 张
  ```
- When `photoCount >= 50`: upload button disabled, text changes to "照片已达上限，请删除旧照片后再添加"

**DataLoader:**
- After initial data load, fetch `/api/profile` to populate `photoCount` in store

---

## Feature 2: Comments System

### Rules

- Comments are on **Location** (travel memory), not individual photos
- **Pure text**, no star ratings
- **50-character limit** per comment
- Interaction model: any logged-in user can comment → **only the memory owner** can reply and delete
- Comments sorted by **newest first** (descending `createdAt`), replies sorted chronologically (ascending)
- Comment panel visible in **both own memories and explore mode**

### Data Model

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

Also add `comments Comment[]` relation to both `User` and `Location` models.

Self-referential `parentId`:
- `null` = top-level comment
- non-null = reply to a specific comment

Cascade delete: deleting a User or Location cleans up all their comments automatically. Deleting a parent comment requires manual recursive deletion of child replies (Prisma's `onDelete: Cascade` does not cover self-referential relations in all cases).

### API Design

#### `GET /api/locations/[id]/comments`

Fetch all comments for a location.

- **Auth:** login required
- **Access:** location must be public, OR current user is the location owner (can view comments on own memories even if private)
- **Response:** top-level comments (`parentId: null`) ordered by `createdAt: desc`, each with nested `replies` (ordered by `createdAt: asc`), each including `user: { id, name, image }`
- **Empty:** returns `{ comments: [] }`

#### `POST /api/locations/[id]/comments`

Create a comment or reply.

- **Auth:** login required
- **Body:** `{ content: string, parentId?: string }`
- **Validation:**
  - `content` required, trimmed, 1–50 characters
  - `parentId` (if provided) must reference an existing comment belonging to the same location
  - Only the **location owner** can set `parentId` (reply). Other users can only create top-level comments (enforce `parentId` is null for non-owners)
- **Response:** created comment with user info, status 201

#### `DELETE /api/comments/[id]`

Delete a comment and all its child replies.

- **Auth:** login required
- **Authorization:** only the **location owner** (`comment.location.userId === session.user.id`)
- **Behavior:** recursively collect all descendant comment IDs, then bulk-delete them together with the target
- **Response:** `{ deleted: true }` or appropriate error

### Permission Matrix

| Action | Owner (看自己) | Visitor in Explore (看他人) |
|---|---|---|
| View comments | ✅ | ✅ |
| Post top-level comment | ✅ | ✅ |
| Reply to a comment | ✅ | ❌ |
| Delete any comment | ✅ | ❌ |

### Frontend

#### New Component: `CommentPanel`

Located to the **right** of the photo area in MemoryOverlay.

**Props:**
- `locationId: string`
- `isOwner: boolean` (true when NOT in explore mode)
- `onClose?: () => void` (toggle panel visibility)

**Layout:**
```
┌──────────────────────┐
│  💬 评论 (3)      ✕  │  ← header with count + close toggle
│                      │
│  👤 张三 · 2分钟前   │
│  好美的日落！        │
│    删除  回复        │  ← text buttons for owner
│                      │
│    └─ 👤 我 · 1分钟前│  ← replies indented
│       谢谢！这是冰岛 │
│         删除         │
│                      │
│  👤 李四 · 5分钟前   │
│  好想去！            │
│    删除  回复        │
│                      │
│  ──────────────────  │
│  ┌────────────────┐  │
│  │ 写下评论...     │  │  ← input area, fixed at bottom
│  │ (12/50)    发送 │  │
│  └────────────────┘  │
└──────────────────────┘
```

**States:**
- **Loading:** `LoadingState` spinner while fetching comments
- **Empty:** "暂无评论，来写第一条吧 ✨"
- **Error:** `ErrorState` with retry button
- **Submitting:** button shows spinner, input disabled

**Interactions:**
- Click "回复" → inline reply input expands below that comment (50 char limit + counter)
- Click "删除" → browser `confirm()` dialog → delete and refresh list
- Submit comment/reply → clears input, resets counter, optimistically appends to list
- Top-level comments sorted newest-first; replies sorted oldest-first

**Panel toggle:** Close button (✕) in header collapses the panel so photos get more space. Re-open by clicking a "💬 评论" toggle button.

#### Modified Component: `MemoryOverlay`

- Layout changes from single-column to **two-column** (flex row): photos on left, CommentPanel on right
- CommentPanel width: ~300px, scrollable
- CommentPanel is always rendered when `expandedMemory` is set and user is logged in
- `isOwner` derived from: `exploreUserId === null` (not in explore mode = viewing own memory)
- When switching photos (different location), re-fetch comments via the `locationId`

#### Re-render triggers

- Store `expandedMemory` changes → load comments for new location
- New comment posted → append to list
- Comment deleted → remove from list
- Panel toggled closed → no re-fetch; re-opening fetches fresh data

### Types

```typescript
// src/lib/types.ts — new types
export interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

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

### File Change Summary

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `Comment` model + relations |
| `src/lib/types.ts` | Add `CommentItem`, `CommentUser` types |
| `src/lib/store.ts` | Add `photoCount`, `maxPhotos` |
| `src/app/api/memories/route.ts` | Add photo count check |
| `src/app/api/locations/[id]/photos/route.ts` | Add photo count check |
| `src/app/api/profile/route.ts` | Response add `photoCount` |
| `src/app/api/locations/[id]/comments/route.ts` | **NEW** — GET + POST comments |
| `src/app/api/comments/[id]/route.ts` | **NEW** — DELETE comment |
| `src/components/ui/CommentPanel.tsx` | **NEW** — comment panel component |
| `src/components/ui/MemoryOverlay.tsx` | Two-column layout + integrate CommentPanel |
| `src/components/ui/AddMemoryModal.tsx` | Show photo quota |
| `src/components/ui/AddPhotoModal.tsx` | Show photo quota |
| `src/components/ui/DataLoader.tsx` | Fetch photoCount on load |

### Error Handling

| Scenario | Response |
|---|---|
| Photo count ≥ 50 at API | 400 "照片已达上限（50张），请删除旧照片后再添加" |
| Batch push over 50 | Reject entire batch, same 400 |
| Comment empty | 400 "评论内容不能为空" |
| Comment > 50 chars | 400 "评论不能超过50字" |
| Reply to deleted comment | 404 "该评论不存在" |
| Non-owner replies | 403 "无权操作" |
| Non-owner deletes | 403 "无权操作" |
| Unauthenticated | 401 "请先登录" |
| Location not found | 404 "记忆不存在" |
| Comment list empty | Show empty state UI |
| Delete cascades children | Recursive collect + bulk delete |
| Network error loading comments | ErrorState with retry button |
| Switching locations | Re-fetch comments for new locationId |

### DB Migration

```bash
npx prisma migrate dev --name add_comments
```

Adds the `comments` table with indexes on `locationId`, `parentId`, and `userId`.
