# 照片上传限制 & 评论系统 — 设计文档

**日期：** 2026-07-01
**状态：** 已确认

---

## 概述

为流浪地球新增两项功能：

1. **照片上传限制**：每个用户最多上传 50 张旅行记忆照片，超过限制时 API 和前端双重拦截并提示。
2. **评论系统**：用户可对旅行记忆（Location）发表文字评论，记忆 owner 可回复和删除评论。

---

## 功能一：照片上传限制（每用户 50 张）

### 规则

- 按用户总量限制，跨所有记忆累计，默认最多 **50 张**（可通过环境变量配置）
- 双重拦截：前端展示剩余配额 + 禁用上传按钮；API 层做最终校验
- 实时计数 — 删除旧照片后配额立即释放

### 配置

环境变量 `MAX_PHOTOS_PER_USER`，默认值 50。修改后重启服务即可生效，无需改代码。

```env
# .env
MAX_PHOTOS_PER_USER=50   # 每用户照片上限，可随时调整
```

在 `src/lib/config.ts` 中集中读取：

```typescript
export const MAX_PHOTOS_PER_USER = parseInt(process.env.MAX_PHOTOS_PER_USER || "50", 10);
```

API 层和前端均通过此配置获取上限值（前端通过 `/api/profile` 获取，见下方）。

### 数据层

无需修改 schema，通过已有关系查询计数：

```
prisma.photo.count({ where: { location: { userId } } })
```

### API 层

**需修改的路由：**

| 路由 | 改动 |
|---|---|
| `POST /api/memories` | 创建照片前检查：`已有数 + 本次新增数 > MAX_PHOTOS_PER_USER` → 400 |
| `POST /api/locations/[id]/photos` | 同上，逐张添加前检查 |
| `GET /api/profile` | 响应新增 `photoCount` 和 `maxPhotos` 字段，供前端展示配额 |

错误提示动态引用上限值，例如：`照片已达上限（${MAX_PHOTOS_PER_USER}张），请删除旧照片后再添加`

**批量拒绝：** 单次请求如会导致超限，整批拒绝（原子操作）。

### 前端

**Store（`src/lib/store.ts`）：**
- 新增字段：`photoCount: number`、`maxPhotos: number`

**DataLoader：**
- 初始加载后调 `/api/profile`，将返回的 `photoCount` 和 `maxPhotos` 写入 store

**AddMemoryModal 和 AddPhotoModal：**
- 照片上传区域上方展示配额提示（数值动态读取）：
  ```
  已上传 42/50 张 · 还可上传 8 张
  ```
- 当 `photoCount >= maxPhotos` 时：上传按钮禁用，提示文字改为 "照片已达上限，请删除旧照片后再添加"

**DataLoader：**
- 初始数据加载后，调 `/api/profile` 获取 `photoCount` 并写入 store

---

## 功能二：评论系统

### 规则

- 评论挂载在 **Location（旅行记忆）** 上，而非单张照片
- **纯文字评论**，无星级评分
- 每条评论限制 **50 字**
- 交互模式：任意登录用户可发表评论 → **仅记忆 owner 可回复和删除**
- 评论按 **最新优先** 排列（`createdAt: desc`），子回复按时间正序
- 评论面板在**自己的记忆和探索他人的记忆**时均显示

### 数据模型

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

同时在 `User` 和 `Location` 模型中添加 `comments Comment[]` 关系。

`parentId` 自引用说明：
- `null` = 顶级评论
- 非 null = 对某条评论的回复

级联删除：删除 User 或 Location 时自动清理其所有评论。删除父评论时需手动递归删除子回复（Prisma 的 `onDelete: Cascade` 在自引用关系上存在限制）。

### API 设计

#### `GET /api/locations/[id]/comments`

获取某条记忆的所有评论。

- **鉴权：** 需登录
- **访问控制：** memory 需为公开，或当前用户是 memory owner（owner 可查看自己私密记忆的评论）
- **响应：** 顶级评论（`parentId: null`）按 `createdAt: desc` 排序，每条嵌套 `replies`（按 `createdAt: asc`），每条评论包含 `user: { id, name, image }`
- **空列表：** 返回 `{ comments: [] }`

#### `POST /api/locations/[id]/comments`

发表评论或回复。

- **鉴权：** 需登录
- **请求体：** `{ content: string, parentId?: string }`
- **校验：**
  - `content` 必填，trim 后 1–50 字
  - 如有 `parentId`，需校验父评论存在且属于同一 location
  - 仅 **memory owner** 可传 `parentId`（回复），非 owner 只能发表顶级评论（强制 `parentId` 为空）
- **响应：** 新建的评论（含 user 信息），状态码 201

#### `DELETE /api/comments/[id]`

删除评论及其所有子回复。

- **鉴权：** 需登录
- **授权：** 仅 **memory owner**（`comment.location.userId === session.user.id`）
- **行为：** 递归收集所有子孙评论 ID，连同目标评论一并批量删除
- **响应：** `{ deleted: true }` 或相应错误

### 权限矩阵

| 操作 | Owner（看自己的记忆） | 访客（探索他人的记忆） |
|---|---|---|
| 查看评论 | ✅ | ✅ |
| 发表顶级评论 | ✅ | ✅ |
| 回复评论 | ✅ | ❌ |
| 删除评论 | ✅ | ❌ |

### 前端

#### 新组件：`CommentPanel`

位于 MemoryOverlay 照片区域的**右侧**。

**Props：**
- `locationId: string`
- `isOwner: boolean`（非探索模式即为 true）
- `onClose?: () => void`（折叠/展开面板）

**布局：**
```
┌──────────────────────┐
│  💬 评论 (3)      ✕  │  ← 头部：评论数 + 关闭/折叠按钮
│                      │
│  👤 张三 · 2分钟前    │
│  好美的日落！         │
│    删除  回复        │  ← owner 可见的文字按钮
│                      │
│    └─ 👤 我 · 1分钟前 │  ← 缩进显示子回复
│       谢谢！这是冰岛   │
│         删除          │
│                      │
│  👤 李四 · 5分钟前    │
│  好想去！             │
│    删除  回复        │
│                      │
│  ──────────────────   │
│  ┌────────────────┐   │
│  │ 写下评论...     │   │  ← 输入区固定在底部
│  │ (12/50)    发送 │   │
│  └────────────────┘   │
└──────────────────────┘
```

**各状态处理：**
- **加载中：** 显示 `LoadingState` 旋转指示器
- **空列表：** 显示 "暂无评论，来写第一条吧 ✨"
- **加载失败：** 显示 `ErrorState` + 重试按钮
- **提交中：** 按钮显示旋转动画，输入框禁用

**交互细节：**
- 点击「回复」→ 该评论下方内联展开回复输入框（50 字限制 + 字数计数），提交后收起
- 点击「删除」→ 浏览器 `confirm()` 弹窗确认 → 删除并刷新列表
- 提交评论/回复 → 清空输入、重置计数器、乐观更新列表
- 顶级评论按最新优先排列，子回复按时间正序排列
- 回复输入框和评论输入框统一限制 maxLength + 实时字数计数

**面板折叠：** 头部 ✕ 按钮可收起面板，给照片更多空间。收起的评论面板旁显示「💬 评论」按钮供重新展开。

#### 修改组件：`MemoryOverlay`

- 布局从单栏改为**左右分栏**（flex row）：左侧照片区 + 右侧 CommentPanel
- CommentPanel 宽度约 300px，内容区可滚动
- 只要 `expandedMemory` 已设置且用户已登录，就渲染 CommentPanel
- `isOwner` 来自：`exploreUserId === null`（非探索模式 = 看自己的记忆）
- 切换到不同记忆时，根据新的 `locationId` 重新请求评论

#### 刷新触发时机

- `expandedMemory` 变化 → 为新记忆加载评论
- 新评论提交成功 → 追加到列表
- 评论删除成功 → 从列表移除
- 面板折叠后重新打开 → 重新请求最新评论

### 类型定义

```typescript
// src/lib/types.ts — 新增类型
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

### 文件改动清单

| 文件 | 操作 |
|---|---|
| `prisma/schema.prisma` | 新增 Comment 模型 + 关系 |
| `src/lib/config.ts` | **新增** — 集中管理可配置项（MAX_PHOTOS_PER_USER 等） |
| `src/lib/types.ts` | 新增 CommentItem、CommentUser 类型 |
| `src/lib/store.ts` | 新增 photoCount、maxPhotos |
| `src/app/api/memories/route.ts` | 增加照片计数校验 |
| `src/app/api/locations/[id]/photos/route.ts` | 增加照片计数校验 |
| `src/app/api/profile/route.ts` | 响应新增 photoCount |
| `src/app/api/locations/[id]/comments/route.ts` | **新增** — GET 列表 + POST 发表 |
| `src/app/api/comments/[id]/route.ts` | **新增** — DELETE 删除 |
| `src/components/ui/CommentPanel.tsx` | **新增** — 评论面板组件 |
| `src/components/ui/MemoryOverlay.tsx` | 左右分栏布局 + 集成 CommentPanel |
| `src/components/ui/AddMemoryModal.tsx` | 展示照片配额 |
| `src/components/ui/AddPhotoModal.tsx` | 展示照片配额 |
| `src/components/ui/DataLoader.tsx` | 初始化时获取 photoCount |

### 错误处理

| 场景 | 响应 |
|---|---|
| API 层已达上限 | 400 "照片已达上限（XX张），请删除旧照片后再添加"（上限值动态读取） |
| 单次批量超限 | 整批拒绝，同上 400 |
| 评论内容为空 | 400 "评论内容不能为空" |
| 评论超过 50 字 | 400 "评论不能超过50字" |
| 回复已删除的评论 | 404 "该评论不存在" |
| 非 owner 尝试回复 | 403 "无权操作" |
| 非 owner 尝试删除 | 403 "无权操作" |
| 未登录 | 401 "请先登录" |
| 记忆不存在 | 404 "记忆不存在" |
| 评论列表为空 | 显示空状态 UI |
| 删除评论级联子回复 | 递归收集 + 批量删除 |
| 加载评论网络错误 | ErrorState + 重试按钮 |
| 切换到不同记忆 | 根据新 locationId 重新请求评论 |

### 环境变量

`.env.example` 新增：

```env
MAX_PHOTOS_PER_USER=50   # 每用户照片上传上限
```

### 数据库迁移

```bash
npx prisma migrate dev --name add_comments
```

新增 `comments` 表，包含 `locationId`、`parentId`、`userId` 索引。
