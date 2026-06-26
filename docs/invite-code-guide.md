# 邀请码管理手册

## 概述

流浪地球平台通过邀请码控制初始阶段的用户注册量。新用户注册时**必须提供有效邀请码**，否则无法完成注册。

每个邀请码可设置最大使用次数，达到上限后自动失效。

---

## 生成邀请码

### 方式一：CLI 脚本（推荐）

首先确保已安装 `tsx`：

```bash
npm install -D tsx
```

#### 基础用法

```bash
npx tsx scripts/seed-invite.ts <邀请码1> [邀请码2] [邀请码3] ...
```

#### 示例

```bash
# 创建 1 个邀请码，默认只能使用 1 次
npx tsx scripts/seed-invite.ts EARTH2024

# 一次创建多个邀请码
npx tsx scripts/seed-invite.ts CODE-ALPHA CODE-BETA CODE-GAMMA

# 指定每个邀请码可使用次数
npx tsx scripts/seed-invite.ts --max 10 VIP-CODE

# 批量指定使用次数
npx tsx scripts/seed-invite.ts --max 5 INVITE-01 INVITE-02 INVITE-03
```

#### 注意事项

- 对已存在的邀请码再次执行会**更新**其 `maxUses`，不会创建重复记录
- 邀请码区分大小写
- 建议使用有一定复杂度的码，避免被猜测

---

### 方式二：Prisma Studio（可视化管理）

```bash
npm run db:studio
```

在浏览器中打开 Prisma Studio 后：

1. 左侧选择 **invite_codes** 表
2. 点击 **Add record** 新增记录
3. 填写字段：
   - `id`：留空自动生成
   - `code`：邀请码字符串（**不可重复**）
   - `maxUses`：最大可使用次数
   - `usedCount`：已使用次数（新建时填 `0`）
4. 点击 **Save 1 change** 保存

---

### 方式三：直接 SQL（紧急情况）

连接数据库后执行：

```sql
INSERT INTO invite_codes (id, code, "maxUses", "usedCount", "createdAt")
VALUES (gen_random_uuid(), 'YOUR-CODE', 10, 0, NOW());
```

---

## 查看邀请码使用情况

### Prisma Studio

```bash
npm run db:studio
```

在 `invite_codes` 表中可查看所有邀请码及其使用情况。

### SQL 查询

```sql
-- 查看所有邀请码
SELECT code, "usedCount", "maxUses", "createdAt"
FROM invite_codes
ORDER BY "createdAt" DESC;

-- 查看仍有剩余次数的邀请码
SELECT code, "usedCount", "maxUses",
       "maxUses" - "usedCount" AS remaining
FROM invite_codes
WHERE "usedCount" < "maxUses"
ORDER BY remaining DESC;
```

---

## 数据库字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String (CUID) | 主键，自动生成 |
| `code` | String (Unique) | 邀请码，全局唯一 |
| `maxUses` | Int | 最大可使用次数，默认 1 |
| `usedCount` | Int | 已使用次数，默认 0 |
| `createdAt` | DateTime | 创建时间 |

---

## 注册时的校验逻辑

1. 用户提交注册表单（邮箱 + 密码 + 邀请码）
2. 服务端查找邀请码：
   - **不存在** → 返回「邀请码无效」
   - **`usedCount >= maxUses`** → 返回「邀请码已被使用完」
   - **有效** → 创建用户，同时 `usedCount + 1`（在同一事务中保证原子性）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | InviteCode 数据模型定义 |
| `src/app/api/auth/register/route.ts` | 注册 API，含邀请码校验 |
| `src/app/register/page.tsx` | 注册页面，含邀请码输入框 |
| `scripts/seed-invite.ts` | 邀请码生成脚本 |
