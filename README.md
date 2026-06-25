# 🌍 流浪地球 (Wandering Earth)

把你的旅行照片标记在 3D 地球上，从太空视角重温每一次旅程。

## ✨ 功能

- 🗺️ **3D 交互地球** — 真实 NASA 纹理贴图，拖拽旋转、缩放
- 📍 **地点标记** — 点击地球或搜索地名，标记你的旅行坐标
- 📸 **照片上传** — 上传旅行照片，支持标题和描述
- 🔭 **太空视角** — 大气层辉光、星空背景，从太空看你的足迹
- 👥 **多用户** — GitHub/Google 登录，每个人都有自己的地球
- 🌐 **分享探索** — 浏览其他旅行者的公开相册

## 🛠️ 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript
- **3D**: Three.js + React Three Fiber + Drei
- **样式**: TailwindCSS
- **数据库**: PostgreSQL (Neon) + Prisma ORM
- **认证**: NextAuth.js v5
- **存储**: AWS S3 / Cloudflare R2
- **部署**: Vercel

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd wandering-earth
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

需要配置：
- **DATABASE_URL** — Neon PostgreSQL 连接串
- **AUTH_SECRET** — 随机密钥 (`openssl rand -base64 32`)
- **AUTH_GITHUB_ID / AUTH_GITHUB_SECRET** — GitHub OAuth App
- **AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET** — Google OAuth
- **S3_*** — 对象存储配置

### 4. 初始化数据库

```bash
npx prisma db push
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth 认证路由
│   │   ├── locations/           # 地点 CRUD API
│   │   └── photos/              # 照片上传 API
│   ├── signin/                  # 登录页面
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页 (3D 地球)
├── components/
│   ├── earth/                   # 3D 组件
│   │   ├── EarthScene.tsx       # 3D 画布容器
│   │   ├── Earth.tsx            # 地球球体
│   │   ├── Atmosphere.tsx       # 大气层辉光
│   │   ├── Stars.tsx            # 星空粒子
│   │   ├── LocationPins.tsx     # 地点标记
│   │   └── CameraController.tsx # 相机控制
│   └── ui/                      # UI 组件
│       ├── Navbar.tsx           # 导航栏
│       ├── PhotoGallery.tsx     # 照片画廊
│       ├── LocationSearch.tsx   # 地点搜索
│       ├── AddLocationModal.tsx # 添加地点
│       └── UploadModal.tsx      # 上传照片
└── lib/
    ├── auth.ts                  # NextAuth 配置
    ├── prisma.ts                # Prisma 客户端
    ├── s3.ts                    # S3 存储工具
    ├── store.ts                 # Zustand 状态管理
    ├── types.ts                 # TypeScript 类型
    └── utils.ts                 # 工具函数
```

## 📝 待完成

- [ ] 配置 OAuth 应用
- [ ] 设置 Neon 数据库
- [ ] 设置 Cloudflare R2 存储桶
- [ ] 部署到 Vercel
