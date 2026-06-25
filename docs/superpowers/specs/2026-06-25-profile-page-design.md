# Profile Page Design

## Overview

为 Wandering Earth（流浪地球）添加个人中心页面 `/profile`。用户可以查看统计、浏览/搜索/编辑/删除自己的旅行记忆。

## API Changes

### 1. 扩展 `GET /api/locations`

新增分页和搜索参数：

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | string | - | 按用户过滤 |
| `page` | int | 1 | 页码 |
| `limit` | int | 12 | 每页数量 |
| `search` | string | - | 模糊匹配地点名称 |

Response format:
```json
{
  "items": [ Location ],
  "total": 100,
  "page": 1,
  "totalPages": 9
}
```

### 2. 新增 `PATCH /api/locations/[id]`

- Auth required，验证 `location.userId === session.user.id`
- Body: `{ name: string }`
- Response: updated Location

### 3. 新增 `PATCH /api/photos/[id]`

- Auth required，通过 `photo.location.userId` 验证归属权
- Body: `{ title?, description?, takenAt? }`
- Response: updated Photo

### 4. 新增 `DELETE /api/photos/[id]`

- Auth required，通过 `photo.location.userId` 验证归属权
- 删除后如果 location 没有照片了，保留空地点
- Response: `{ success: true }`

### 5. 新增 `PATCH /api/profile`

- Auth required，更新当前登录用户信息
- Body: `{ name: string }`
- Response: updated User（不含 passwordHash）
- 注意：更新后 NextAuth session JWT 中的 name 不会立即更新，需下次 token 刷新后生效，ProfileHeader 直接使用 API 返回的新 name 刷新本地状态即可

## Route

`/app/profile/page.tsx` — Server Component

- 调用 `auth()` 验证登录，未登录重定向到 `/signin`
- 将 `session.user` 传给 ProfileContent，其余数据由 ProfileContent 客户端 fetch

## Components

### ProfileContent (Client Component)

页面主容器，管理所有局部状态：

- `searchQuery` — 搜索关键词
- `currentPage` — 当前页码
- `expandedId` — 当前展开的地点 ID（null = 全部收起）
- `editingLocation` — 正在编辑的地点（null = 关闭）
- `editingPhoto` — 正在编辑的照片（null = 关闭）
- `deletingTarget` — 待删除的目标 `{ type: 'location'|'photo', id }`

### ProfileHeader

- 显示昵称（行内编辑：点击 → input → 回车/blur 保存）
- 显示邮箱（只读灰色文字）
- 更新昵称：调用 `PATCH /api/profile`（或复用现有机制）
- 显示注册时间（格式化为中文日期）

### ProfileStats

统计卡片，数据来自 API 响应的 `total` 字段：

- 地点总数
- 照片总数

### SearchBar

- 输入框 + 搜索图标
- 300ms debounce 后触发搜索
- 搜索时重置到第一页

### MemoryList → MemoryCard

每个 MemoryCard 显示：

- 封面缩略图（第一张照片，16:9 比例）
- 地点名称
- 照片数量
- 操作按钮：展开/收起、编辑名称、删除地点

点击卡片主体 → 展开/收起 PhotoGrid（手风琴模式，同一时间只有一个展开）

### PhotoGrid → PhotoItem

3 列网格布局，每个 PhotoItem：

- 照片缩略图（cover fit）
- hover 时显示 overlay：标题（如果有）、编辑按钮、删除按钮
- 点击编辑 → 打开 EditPhotoModal
- 点击删除 → 打开 DeleteConfirmModal

### Pagination

- 上一页 / 下一页按钮 + 当前页/总页数显示
- 第一页时禁用"上一页"，最后一页时禁用"下一页"

### EditLocationModal

- 单一输入框：地点名称
- 保存 → `PATCH /api/locations/[id]` → 局部更新列表
- 取消 → 关闭

### EditPhotoModal

- 输入字段：标题、描述、拍摄日期
- 保存 → `PATCH /api/photos/[id]` → 局部更新列表
- 取消 → 关闭

### DeleteConfirmModal

- 通用确认弹窗，显示"确认删除 XXX？此操作不可撤销"
- 确认 → `DELETE /api/locations/[id]` 或 `DELETE /api/photos/[id]` → 局部更新列表
- 取消 → 关闭

## Data Flow

```
ProfilePage (Server Component)
  ├── auth() 验证登录，提取 session.user
  └── ProfileContent (Client Component, 接收 user prop)
      ├── useEffect → fetch /api/locations?userId=...&page=...&search=...
      ├── 更新昵称 → PATCH /api/profile → 更新本地 user.name
      ├── 搜索 → 更新 searchQuery → fetch（reset page=1）
      ├── 翻页 → 更新 currentPage → fetch
      ├── 展开 → 更新 expandedId（纯 UI，不需要额外请求）
      ├── 编辑地点 → PATCH /api/locations/[id] → 局部更新 items
      ├── 编辑照片 → PATCH /api/photos/[id] → 局部更新 items
      ├── 删除地点 → DELETE /api/locations/[id] → 移除 item
      └── 删除照片 → DELETE /api/photos/[id] → 局部更新 item.photos
```

## Error Handling

- API 错误统一用 toast 提示（已有 sonner 依赖）
- 网络错误："网络异常，请重试"
- 权限错误："无权操作"
- 404："记忆不存在"

## States

每个组件覆盖以下状态：

- **Loading**: 首次加载骨架屏，操作中按钮 loading 态
- **Empty**: 无记忆时显示引导文案 "还没有旅行记忆，去地球添加一个吧"
- **Error**: toast 提示 + 保留当前数据显示
- **Edge cases**: 地点下最后一张照片被删除后，地点卡片仍显示（photoCount=0）

## Styling

- TailwindCSS，保持暗色太空主题
- 复用 `glass` utility class（半透明毛玻璃面板）
- 卡片 hover 效果与现有 LeftSidebar 风格一致
- Profile 页全屏布局，左侧可保留折叠的 sidebar

## Not in Scope

- 头像上传/编辑
- 数据导出
- 点击跳转到地球位置
- 其他用户的个人中心浏览
- 个人资料密码修改
