const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  createAPIContext,
  getAdminToken,
  getAuthHeaders,
  createTestUser,
  cleanupTestUser,
} = require(path.join(__dirname, 'utils', 'apiHelper'));

test.describe('用户管理API测试', () => {
  let apiContext;
  let adminToken;

  test.beforeAll(async () => {
    apiContext = await createAPIContext();
    adminToken = await getAdminToken();
  });

  test.describe('GET /api/users - 获取用户列表', () => {
    test('管理员应该能够获取所有用户', async () => {
      const response = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });

      expect(response.status()).toBe(200);
      const users = await response.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      
      const admin = users.find(u => u.role === 'admin');
      expect(admin).toBeDefined();
    });

    test('普通用户不应该能获取用户列表', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/users', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('需要管理员权限');
    });

    test('未登录用户不应该能获取用户列表', async () => {
      const response = await apiContext.get('/api/users');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PUT /api/users/:id/verify - 更新用户状态', () => {
    test('管理员应该能够激活用户', async () => {
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

      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const newUser = users.find(u => u.email === email);

      const response = await apiContext.put(`/api/users/${newUser.id}/verify`, {
        headers: getAuthHeaders(adminToken),
        data: {
          is_verified: true,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('用户状态更新成功');
    });

    test('管理员应该能够更新用户角色', async () => {
      const user = await createTestUser('user', true);

      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const newUser = users.find(u => u.email === user.email);

      const response = await apiContext.put(`/api/users/${newUser.id}/verify`, {
        headers: getAuthHeaders(adminToken),
        data: {
          is_verified: true,
          role: 'reviewer',
        },
      });

      expect(response.status()).toBe(200);
    });

    test('管理员不能更新不存在的用户', async () => {
      const response = await apiContext.put('/api/users/99999/verify', {
        headers: getAuthHeaders(adminToken),
        data: {
          is_verified: true,
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('用户不存在');
    });

    test('普通用户不应该能更新用户状态', async () => {
      const user = await createTestUser('user', true);
      const anotherUser = await createTestUser('user', true);

      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const targetUser = users.find(u => u.email === anotherUser.email);

      const response = await apiContext.put(`/api/users/${targetUser.id}/verify`, {
        headers: getAuthHeaders(user.token),
        data: {
          is_verified: true,
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('DELETE /api/users/:id - 删除用户', () => {
    test('管理员应该能够删除用户', async () => {
      const user = await createTestUser('user', true);

      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const userToDelete = users.find(u => u.email === user.email);

      const response = await apiContext.delete(`/api/users/${userToDelete.id}`, {
        headers: getAuthHeaders(adminToken),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('用户删除成功');
    });

    test('管理员不应该能删除自己', async () => {
      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const admin = users.find(u => u.role === 'admin');

      const response = await apiContext.delete(`/api/users/${admin.id}`, {
        headers: getAuthHeaders(adminToken),
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('不能删除自己的账户');
    });

    test('管理员不能删除不存在的用户', async () => {
      const response = await apiContext.delete('/api/users/99999', {
        headers: getAuthHeaders(adminToken),
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('用户不存在');
    });

    test('普通用户不应该能删除用户', async () => {
      const user = await createTestUser('user', true);
      const anotherUser = await createTestUser('user', true);

      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const targetUser = users.find(u => u.email === anotherUser.email);

      const response = await apiContext.delete(`/api/users/${targetUser.id}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(403);
    });
  });
});
