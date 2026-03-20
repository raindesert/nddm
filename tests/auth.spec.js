const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  createAPIContext,
  getAuthHeaders,
  createTestUser,
  cleanupTestUser,
} = require(path.join(__dirname, 'utils', 'apiHelper'));

test.describe('认证API测试', () => {
  let apiContext;

  test.beforeEach(async () => {
    apiContext = await createAPIContext();
  });

  test.describe('POST /api/auth/register - 用户注册', () => {
    test('应该成功注册新用户', async () => {
      const timestamp = Date.now();
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: `newuser_${timestamp}@example.com`,
          password: 'password123',
          name: `新用户 ${timestamp}`,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('注册成功，请联系管理员激活账户');
      expect(body.userId).toBeDefined();
    });

    test('应该拒绝缺少邮箱的注册', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: {
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('邮箱和密码为必填项');
    });

    test('应该拒绝缺少密码的注册', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: 'test@example.com',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('邮箱和密码为必填项');
    });

    test('应该拒绝无效的邮箱格式', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('邮箱格式不正确');
    });

    test('应该拒绝短密码', async () => {
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: 'test@example.com',
          password: '12345',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('密码长度至少6位');
    });

    test('应该拒绝重复邮箱注册', async () => {
      const timestamp = Date.now();
      const email = `duplicate_${timestamp}@example.com`;

      await apiContext.post('/api/auth/register', {
        data: {
          email: email,
          password: 'password123',
        },
      });

      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: email,
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('该邮箱已被注册');
    });
  });

  test.describe('POST /api/auth/login - 用户登录', () => {
    test('应该成功登录已激活用户', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: user.email,
          password: 'password123',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('登录成功');
      expect(body.token).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(user.email);
    });

    test('应该拒绝未激活账户', async () => {
      const timestamp = Date.now();
      const email = `unverified_${timestamp}@example.com`;
      
      const registerResponse = await apiContext.post('/api/auth/register', {
        data: {
          email: email,
          password: 'password123',
          name: `Unverified User ${timestamp}`,
        },
      });
      
      expect(registerResponse.status()).toBe(201);

      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: email,
          password: 'password123',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('账户尚未激活，请联系管理员');
    });

    test('应该拒绝错误密码', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: user.email,
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('邮箱或密码错误');
    });

    test('应该拒绝不存在的用户', async () => {
      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('邮箱或密码错误');
    });

    test('应该拒绝缺少邮箱的登录', async () => {
      const response = await apiContext.post('/api/auth/login', {
        data: {
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('邮箱和密码为必填项');
    });

    test('应该拒绝缺少密码的登录', async () => {
      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('邮箱和密码为必填项');
    });
  });

  test.describe('GET /api/auth/me - 获取当前用户信息', () => {
    test('应该成功获取当前用户信息', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/auth/me', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.email).toBe(user.email);
      expect(body.id).toBeDefined();
    });

    test('应该拒绝未提供token的请求', async () => {
      const response = await apiContext.get('/api/auth/me');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('未提供认证令牌');
    });

    test('应该拒绝无效的token', async () => {
      const response = await apiContext.get('/api/auth/me', {
        headers: getAuthHeaders('invalid-token'),
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('令牌无效或已过期');
    });
  });

  test.describe('POST /api/auth/change-password - 修改密码', () => {
    test('应该成功修改密码', async () => {
      const user = await createTestUser('user', true);
      const newPassword = 'newpassword123';

      const response = await apiContext.post('/api/auth/change-password', {
        headers: getAuthHeaders(user.token),
        data: {
          oldPassword: 'password123',
          newPassword: newPassword,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('密码修改成功');

      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: user.email,
          password: newPassword,
        },
      });
      expect(loginResponse.status()).toBe(200);
    });

    test('应该拒绝错误的旧密码', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/change-password', {
        headers: getAuthHeaders(user.token),
        data: {
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('旧密码错误');
    });

    test('应该拒绝短新密码', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/change-password', {
        headers: getAuthHeaders(user.token),
        data: {
          oldPassword: 'password123',
          newPassword: '12345',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('新密码长度至少6位');
    });

    test('应该拒绝缺少旧密码', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/change-password', {
        headers: getAuthHeaders(user.token),
        data: {
          newPassword: 'newpassword123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('旧密码和新密码为必填项');
    });

    test('应该拒绝缺少新密码', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/auth/change-password', {
        headers: getAuthHeaders(user.token),
        data: {
          oldPassword: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('旧密码和新密码为必填项');
    });
  });
});
