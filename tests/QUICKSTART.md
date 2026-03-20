# 快速开始测试

## 1. 安装依赖并初始化数据库

```bash
# 安装依赖
npm install

# 初始化数据库
npm run init-db
```

## 2. 运行测试

### 最快方式：运行所有测试

```bash
npm test
```

### 分类运行

```bash
# API 测试
npm run test:api

# E2E 测试
npm run test:e2e

# 数据库测试
npm run test:db

# 单个模块测试
npm run test:auth      # 认证测试
npm run test:users     # 用户管理测试
npm run test:tables    # 表结构测试
npm run test:applications  # 申请表测试
```

### 可视化调试

```bash
# UI 模式（推荐）
npm run test:ui

# 浏览器可见模式
npm run test:headed
```

### 查看测试报告

```bash
npm run test:report
```

## 3. 查看帮助

```bash
npm run test:help
```

## 测试说明

| 测试类型 | 覆盖内容 | 运行时间 |
|---------|---------|---------|
| 认证测试 | 注册、登录、JWT、密码修改 | ~5秒 |
| 用户管理测试 | CRUD、权限控制 | ~5秒 |
| 表结构测试 | 查询、详情、字段信息 | ~3秒 |
| 申请表测试 | 完整审批流程 | ~15秒 |
| E2E测试 | 前端交互、UI测试 | ~30秒 |
| 数据库测试 | CRUD操作、数据完整性 | ~3秒 |

**预计总运行时间：** 约 1-2 分钟

## 常见问题

### Q: 测试失败，提示端口被占用？

```bash
# 查看占用端口的进程
netstat -ano | findstr :3000

# 结束进程（替换PID）
taskkill /PID <PID> /F
```

### Q: 提示浏览器未安装？

```bash
npm run test:install
```

### Q: 如何只运行特定测试？

```bash
# 运行特定测试文件
npx playwright test tests/auth.spec.js

# 运行特定测试用例
npx playwright test --grep "应该成功登录"
```

### Q: 如何跳过某些测试？

```bash
# 跳过E2E测试
npx playwright test --grep-invert "E2E"
```

## 预期测试结果

所有测试应该通过 ✓

如果有任何测试失败，请检查：
1. 数据库是否正确初始化
2. 服务器是否正常运行在 3000 端口
3. 网络连接是否正常
