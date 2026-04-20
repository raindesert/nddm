# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

表结构申请系统 - 一个用于管理和审批数据库表结构变更的 Web 应用。使用 Node.js + Express.js 后端、SQLite (sql.js) 数据库、Vue.js + Element UI 前端、Playwright 测试。

## 常用命令

```bash
# 安装依赖
npm install

# 初始化数据库
npm run init-db

# 启动开发服务器 (热更新)
npm run dev

# 生产模式启动
npm start

# 运行所有测试
npm test

# 运行特定测试
npm run test:api      # API 测试
npm run test:e2e      # E2E 测试
npm run test:db       # 数据库测试
npm run test:auth     # 认证测试
npm run test:users    # 用户管理测试
npm run test:tables   # 表结构测试
npm run test:applications  # 申请表测试

# UI 模式调试 (浏览器可见)
npm run test:ui

# 查看测试帮助
npm run test:help
```

## 架构

### 数据库架构

系统使用双数据库设计：
- **用户数据库** (`server/data/users.db`) - 存储用户、环境配置
- **环境数据库** (`server/data/env_${envId}.db`) - 每个环境独立数据库，包含表结构、申请表等

数据库操作封装在 `server/db.js`，提供统一的 CRUD 接口。

### 认证机制

JWT 认证，中间件位于 `server/middleware/auth.js`：
- `authenticateToken` - 验证 JWT 令牌
- `requireAdmin` - 仅限管理员
- `requireReviewer` - 审核员或管理员

### API 路由结构

- `/api/auth` - 认证 (注册、登录、修改密码)
- `/api/users` - 用户管理 (需管理员权限)
- `/api/environments` - 环境管理
- `/api/table-schemas` - 表结构管理
- `/api/applications` - 申请表 (创建、审批)

### 用户角色

| 角色 | 权限 |
|------|------|
| user | 提交申请、查看表结构 |
| reviewer | 审核申请、查看表结构 |
| admin | 所有权限，包括用户管理 |

## 默认账户

- 邮箱: `admin@example.com`
- 密码: `admin123`

## 测试配置

Playwright 配置在 `playwright.config.js`，测试文件位于 `tests/` 目录。测试运行前会自动启动开发服务器 (`npm run dev`)。
