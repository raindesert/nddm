# 表结构申请系统 - 测试文档

## 测试概览

本项目使用 Playwright 进行端到端测试和 API 测试。

## 测试结构

```
tests/
├── utils/
│   └── apiHelper.js          # 测试辅助工具
├── auth.spec.js              # 认证API测试
├── users.spec.js             # 用户管理API测试
├── tableSchemas.spec.js      # 表结构管理API测试
├── applications.spec.js      # 申请表管理API测试
├── e2e.spec.js                # 端到端测试
└── database.spec.js           # 数据库操作测试
```

## 运行测试

### 前置条件

1. 确保已安装依赖：
```bash
npm install
```

2. 初始化数据库：
```bash
npm run init-db
```

### 运行所有测试

```bash
npx playwright test
```

### 运行特定测试文件

```bash
# 运行认证测试
npx playwright test tests/auth.spec.js

# 运行用户管理测试
npx playwright test tests/users.spec.js

# 运行表结构测试
npx playwright test tests/tableSchemas.spec.js

# 运行申请表测试
npx playwright test tests/applications.spec.js

# 运行E2E测试
npx playwright test tests/e2e.spec.js

# 运行数据库测试
npx playwright test tests/database.spec.js
```

### 运行特定标签的测试

```bash
# 运行所有API测试
npx playwright test --grep "API"

# 运行所有E2E测试
npx playwright test --grep "E2E"

# 运行认证相关测试
npx playwright test --grep "认证"
```

### 交互模式

```bash
npx playwright test --ui
```

### 查看测试报告

```bash
# 生成HTML报告
npx playwright test --reporter=html

# 查看报告
npx playwright show-report
```

## 测试覆盖范围

### API测试

- [x] 认证API（注册、登录、获取用户信息、修改密码）
- [x] 用户管理API（获取用户列表、更新用户状态、删除用户）
- [x] 表结构管理API（获取表结构列表、获取表详情、按表名查询）
- [x] 申请表管理API（创建申请、获取申请列表、审核申请、删除申请）

### 功能测试

- [x] 用户注册和登录流程
- [x] 权限控制（管理员、审核员、普通用户）
- [x] 完整的申请审批流程
- [x] 数据库CRUD操作
- [x] 数据完整性和约束

### E2E测试

- [x] 页面加载和导航
- [x] 用户登录流程
- [x] 响应式设计（移动端、平板、桌面）
- [x] 错误处理

## 测试配置

测试配置位于 `playwright.config.js`：

- 测试目录：`./tests`
- 基础URL：`http://localhost:3000`
- 并行执行：是
- 重试次数：CI环境2次，本地0次
- 截图：仅在失败时

## 调试测试

### 查看控制台日志

```bash
DEBUG=pw:browser npx playwright test
```

### 在特定浏览器中运行

```bash
npx playwright test --project=chromium
```

### 暂停测试执行

在测试中添加以下代码来暂停：

```javascript
await page.pause();
```

### 查看测试执行过程

```bash
npx playwright test --headed
```

## 编写新测试

### API测试示例

```javascript
const { test, expect } = require('@playwright/test');
const { createAPIContext, getAuthHeaders } = require('../utils/apiHelper');

test.describe('新功能测试', () => {
  let apiContext;

  test.beforeEach(async () => {
    apiContext = await createAPIContext();
  });

  test('应该成功执行操作', async () => {
    const response = await apiContext.get('/api/endpoint', {
      headers: getAuthHeaders('your-token'),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('expectedField');
  });
});
```

### E2E测试示例

```javascript
test('新功能E2E测试', async ({ page }) => {
  await page.goto('/new-feature');
  
  const button = page.locator('button:has-text("提交")');
  await expect(button).toBeVisible();
  
  await button.click();
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## CI/CD集成

在CI环境中运行测试：

```bash
# 安装浏览器
npx playwright install --with-deps chromium

# 运行测试
npx playwright test
```

GitHub Actions 示例：

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run init-db
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

## 常见问题

### 测试失败：数据库未初始化

```bash
npm run init-db
```

### 测试失败：端口被占用

修改 `playwright.config.js` 中的端口，或停止占用3000端口的进程。

### 测试失败：浏览器未安装

```bash
npx playwright install chromium
```

### E2E测试超时

增加超时时间：

```javascript
test.setTimeout(60000); // 60秒
```

## 维护

- 定期更新 Playwright 版本
- 定期运行完整测试套件
- 新功能需要编写对应的测试
- 修复bug时添加回归测试
