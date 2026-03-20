# 表结构申请系统

一个用于管理和审批数据库表结构变更的Web应用系统。

## 功能特性

- **用户认证** - 注册、登录、JWT令牌认证
- **用户管理** - 管理员可管理用户、分配角色、激活账户
- **表结构管理** - 查看和管理数据库表结构定义
- **申请表审批** - 提交表结构变更申请，支持新建表和修改表
- **审批流程** - 审核员/管理员审批申请，追踪申请状态
- **字段变更追踪** - 详细记录每个申请的字段变更内容

## 技术栈

- **后端**: Node.js + Express.js
- **数据库**: SQLite (sql.js)
- **认证**: JWT + bcryptjs
- **前端**: Vue.js + Element UI
- **测试**: Playwright

## 快速开始

### 环境要求

- Node.js >= 14
- npm

### 安装

```bash
# 克隆项目
git clone https://github.com/raindesert/nddm.git
cd nddm

# 安装依赖
npm install

# 初始化数据库
npm run init-db
```

### 启动

```bash
# 开发模式 (热更新)
npm run dev

# 生产模式
npm start
```

访问 http://localhost:3000

### 默认管理员账户

- 邮箱: `admin@example.com`
- 密码: `admin123`

## 项目结构

```
nddm/
├── client/              # 前端代码
│   └── dist/            # 打包后的静态文件
├── server/              # 后端代码
│   ├── index.js         # 服务器入口
│   ├── db.js           # 数据库操作
│   ├── init-db.js      # 数据库初始化
│   ├── middleware/      # 中间件
│   │   └── auth.js      # 认证中间件
│   └── routes/          # API路由
│       ├── auth.js         # 认证路由
│       ├── users.js        # 用户管理路由
│       ├── tableSchemas.js # 表结构路由
│       └── applications.js # 申请表路由
├── tests/              # 测试代码
│   ├── utils/           # 测试工具
│   ├── auth.spec.js     # 认证测试
│   ├── users.spec.js    # 用户管理测试
│   ├── tableSchemas.spec.js  # 表结构测试
│   ├── applications.spec.js  # 申请表测试
│   ├── e2e.spec.js      # E2E测试
│   └── database.spec.js # 数据库测试
├── package.json
└── playwright.config.js # Playwright配置
```

## API接口

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| POST | /api/auth/change-password | 修改密码 |

### 用户管理接口 (需管理员权限)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/users | 获取用户列表 |
| PUT | /api/users/:id/verify | 更新用户状态 |
| DELETE | /api/users/:id | 删除用户 |

### 表结构接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/table-schemas | 获取表结构列表 |
| GET | /api/table-schemas/:id | 获取表结构详情 |
| GET | /api/table-schemas/name/:tableName | 按表名获取表结构 |

### 申请表接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/applications | 获取申请列表 |
| GET | /api/applications/:id | 获取申请详情 |
| POST | /api/applications | 创建申请 |
| PUT | /api/applications/:id/review | 审核申请 (审核员/管理员) |
| DELETE | /api/applications/:id | 删除申请 |

## 测试

```bash
# 运行所有测试
npm test

# 运行API测试
npm run test:api

# 运行E2E测试
npm run test:e2e

# 运行数据库测试
npm run test:db

# UI模式调试
npm run test:ui
```

## 用户角色

| 角色 | 权限 |
|------|------|
| user | 提交申请、查看表结构 |
| reviewer | 审核申请、查看表结构 |
| admin | 所有权限，包括用户管理 |

## 数据库表

- `users` - 用户表
- `table_schemas` - 表结构定义
- `table_fields` - 字段定义
- `schema_applications` - 申请表
- `application_field_changes` - 字段变更记录

## 开发

```bash
# 启动开发服务器 (需要单独启动)
npm run dev

# 初始化数据库
npm run init-db

# 查看测试帮助
npm run test:help
```

## License
