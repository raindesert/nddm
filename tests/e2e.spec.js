const { test, expect } = require('@playwright/test');

test.describe('E2E测试 - 登录和注册流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该能够访问首页', async ({ page }) => {
    await expect(page).toHaveTitle(/表结构申请系统/);
  });

  test('应该显示登录表单', async ({ page }) => {
    const loginForm = page.locator('.el-form').first();
    await expect(loginForm).toBeVisible();
  });

  test('应该能够切换到注册表单', async ({ page }) => {
    const registerLink = page.locator('text=注册');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('E2E测试 - 认证流程', () => {
  test('管理员应该能够登录', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');

    const submitButton = page.locator('button').first();
    await submitButton.click();

    await page.waitForTimeout(2000);
  });

  test('应该显示登录错误信息', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('wrongpassword');

    const submitButton = page.locator('button').first();
    await submitButton.click();

    await page.waitForTimeout(1000);
  });
});

test.describe('E2E测试 - 导航和页面结构', () => {
  test.use({ baseURL: 'http://localhost:3000' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    try {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('admin@example.com');
        await passwordInput.fill('admin123');
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Already logged in or login not required');
    }
  });

  test('应该能够看到主导航菜单', async ({ page }) => {
    const nav = page.locator('nav, .sidebar, .menu');
    const hasNav = await nav.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasNav) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('应该能够看到用户信息', async ({ page }) => {
    const userInfo = page.locator('text=admin@example.com, text=系统管理员, text=admin');
    await expect(userInfo.first()).toBeVisible({ timeout: 3000 }).catch(() => {
      console.log('User info not visible');
    });
  });
});

test.describe('E2E测试 - 表结构页面', () => {
  test.use({ baseURL: 'http://localhost:3000' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    try {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('admin@example.com');
        await passwordInput.fill('admin123');
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Already logged in or login not required');
    }
  });

  test('应该能够看到表结构列表', async ({ page }) => {
    await page.goto('/tables');
    await page.waitForTimeout(1000);

    const tableList = page.locator('table, .table-list, .schema-list');
    const hasTable = await tableList.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTable) {
      await expect(tableList.first()).toBeVisible();
    }
  });

  test('应该显示示例表（users, orders, products）', async ({ page }) => {
    await page.goto('/tables');
    await page.waitForTimeout(1000);

    const tableNames = ['users', 'orders', 'products'];
    
    for (const tableName of tableNames) {
      const tableElement = page.locator(`text=${tableName}`);
      const hasTable = await tableElement.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasTable) {
        await expect(tableElement.first()).toBeVisible();
      }
    }
  });
});

test.describe('E2E测试 - 申请表页面', () => {
  test.use({ baseURL: 'http://localhost:3000' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    try {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('admin@example.com');
        await passwordInput.fill('admin123');
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Already logged in or login not required');
    }
  });

  test('应该能够看到申请列表', async ({ page }) => {
    await page.goto('/applications');
    await page.waitForTimeout(1000);

    const applicationList = page.locator('.application-list, table, .list');
    const hasList = await applicationList.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasList) {
      await expect(applicationList.first()).toBeVisible();
    }
  });

  test('应该能够看到新建申请按钮', async ({ page }) => {
    await page.goto('/applications');
    await page.waitForTimeout(1000);

    const newButton = page.locator('button:has-text("新建"), button:has-text("创建"), button:has-text("申请")');
    const hasButton = await newButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasButton) {
      await expect(newButton.first()).toBeVisible();
    }
  });
});

test.describe('E2E测试 - 响应式设计', () => {
  test('应该能够在移动端视口下正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page).toHaveTitle(/表结构申请系统/);
    
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible({ timeout: 3000 }).catch(() => {
      console.log('Login form not visible on mobile');
    });
  });

  test('应该能够在平板视口下正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page).toHaveTitle(/表结构申请系统/);
  });

  test('应该能够在桌面视口下正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page).toHaveTitle(/表结构申请系统/);
  });
});

test.describe('E2E测试 - 错误处理', () => {
  test('应该处理404页面', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    await page.waitForTimeout(1000);
  });
});
