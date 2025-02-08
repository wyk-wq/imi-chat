# IMI Chat - 实时聊天应用

一个基于 Next.js 15 和 Socket.IO 构建的现代化实时聊天应用。

## 功能特点

- 🔐 用户认证与授权
  - JWT 基于的身份验证
  - 安全的密码加密存储
  - 会话管理

- 💬 实时通讯
  - 公共聊天室
  - 私人对话
  - 在线状态显示
  - 已读/未读状态
  - 输入状态提示

- 📝 消息功能
  - Markdown 格式支持
  - 代码高亮显示
  - 消息撤回
  - 消息删除
  - 一键复制
  - 清除聊天记录

- 👥 联系人管理
  - 添加/删除联系人
  - 在线状态同步
  - 未读消息计数

- 🎨 用户界面
  - 响应式设计
  - 简洁现代的界面
  - 流畅的动画效果

## 技术栈

- **前端**:
  - Next.js 15
  - React 18
  - Socket.IO-client
  - React Markdown
  - CSS Modules

- **后端**:
  - Node.js
  - Socket.IO
  - Prisma ORM
  - MySQL

- **工具**:
  - TypeScript
  - ESLint
  - Prettier

## 在线演示

[在线体验地址](https://imi-chat.vercel.app)

## 快速开始

### 前置要求

- Node.js 18.17 或更高版本
- MySQL 数据库
- Git

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/sean-wyk/imi-chat.git
cd imi-chat
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件并配置以下变量：
```env
DATABASE_URL="mysql://user:password@localhost:3306/chat_db"
JWT_SECRET="your-secret-key"
NODE_ENV="development"
```

4. 初始化数据库
```bash
npx prisma generate
npx prisma migrate dev
```

5. 启动开发服务器
```bash
npm run dev
```

现在可以访问 http://localhost:3000 查看应用。

## 部署

### Vercel 部署步骤

1. Fork 此仓库到你的 GitHub 账户

2. 在 Vercel 中导入项目
   - 连接你的 GitHub 仓库
   - 选择要部署的项目

3. 配置环境变量
   在 Vercel 项目设置中添加以下环境变量：
   - `DATABASE_URL`: 你的数据库连接 URL（推荐使用 PlanetScale）
   - `JWT_SECRET`: 用于 JWT 加密的密钥
   - `NODE_ENV`: 设置为 "production"

4. 部署
   - Vercel 会自动检测 Next.js 项目并使用正确的构建设置
   - 构建完成后，你的应用就可以访问了

### 数据库配置

推荐使用 PlanetScale 作为数据库服务：
1. 在 PlanetScale 创建数据库
2. 获取数据库连接 URL
3. 在环境变量中配置 DATABASE_URL
4. 运行数据库迁移

## 项目结构

```
imi-chat/
├── src/
│   ├── app/              # Next.js 15 App Router
│   │   ├── api/         # API 路由
│   │   ├── chat/        # 聊天页面
│   │   ├── login/       # 登录页面
│   │   └── register/    # 注册页面
│   ├── utils/           # 工具函数
│   └── types/           # TypeScript 类型定义
├── prisma/              # Prisma 配置和迁移
├── public/             # 静态资源
└── package.json        # 项目配置
```

## 环境变量

必需的环境变量：

- `DATABASE_URL`: 数据库连接字符串
- `JWT_SECRET`: JWT 加密密钥
- `NODE_ENV`: 运行环境 (development/production)

## 主要功能说明

- **实时聊天**: 基于 Socket.IO 实现的实时通讯
- **用户认证**: 使用 JWT 进行身份验证
- **消息持久化**: 使用 MySQL 存储聊天记录
- **Markdown 支持**: 支持富文本格式和代码高亮
- **已读状态**: 私聊消息的已读/未读状态显示
- **在线状态**: 实时显示用户在线状态
- **消息管理**: 支持撤回、删除和清除聊天记录

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
