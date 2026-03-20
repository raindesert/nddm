const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  createAPIContext,
  getAuthHeaders,
  createTestUser,
  getAdminToken,
} = require(path.join(__dirname, 'utils', 'apiHelper'));

test.describe('表结构管理API测试', () => {
  let apiContext;

  test.beforeEach(async () => {
    apiContext = await createAPIContext();
  });

  test.describe('GET /api/table-schemas - 获取表结构列表', () => {
    test('已认证用户应该能够获取表结构列表', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tables = await response.json();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);

      const firstTable = tables[0];
      expect(firstTable.id).toBeDefined();
      expect(firstTable.table_name).toBeDefined();
      expect(firstTable.field_count).toBeDefined();
    });

    test('未登录用户不应该能获取表结构列表', async () => {
      const response = await apiContext.get('/api/table-schemas');

      expect(response.status()).toBe(401);
    });

    test('应该返回示例表（users, orders, products）', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tables = await response.json();
      
      const tableNames = tables.map(t => t.table_name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('products');
    });

    test('表应该包含field_count字段', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tables = await response.json();
      
      const usersTable = tables.find(t => t.table_name === 'users');
      expect(usersTable.field_count).toBeGreaterThan(0);
    });
  });

  test.describe('GET /api/table-schemas/:id - 获取表结构详情', () => {
    test('应该成功获取表结构详情', async () => {
      const user = await createTestUser('user', true);

      const listResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });
      const tables = await listResponse.json();
      const usersTable = tables.find(t => t.table_name === 'users');

      const response = await apiContext.get(`/api/table-schemas/${usersTable.id}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tableDetail = await response.json();
      expect(tableDetail.id).toBe(usersTable.id);
      expect(tableDetail.table_name).toBe('users');
      expect(tableDetail.fields).toBeDefined();
      expect(Array.isArray(tableDetail.fields)).toBe(true);
      expect(tableDetail.fields.length).toBeGreaterThan(0);
    });

    test('应该返回正确的字段信息', async () => {
      const user = await createTestUser('user', true);

      const listResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });
      const tables = await listResponse.json();
      const usersTable = tables.find(t => t.table_name === 'users');

      const response = await apiContext.get(`/api/table-schemas/${usersTable.id}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tableDetail = await response.json();
      
      const idField = tableDetail.fields.find(f => f.field_name === 'id');
      expect(idField).toBeDefined();
      expect(idField.field_type).toBe('INTEGER');
      expect(idField.is_primary_key).toBe(1);
    });

    test('应该拒绝不存在的表ID', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas/99999', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('表不存在');
    });

    test('未登录用户不应该能获取表结构详情', async () => {
      const response = await apiContext.get('/api/table-schemas/1');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/table-schemas/name/:tableName - 按表名获取表结构', () => {
    test('应该通过表名成功获取表结构', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas/name/users', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tableDetail = await response.json();
      expect(tableDetail.table_name).toBe('users');
      expect(tableDetail.fields).toBeDefined();
    });

    test('应该返回orders表的正确字段', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas/name/orders', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const tableDetail = await response.json();
      
      const fields = tableDetail.fields.map(f => f.field_name);
      expect(fields).toContain('id');
      expect(fields).toContain('user_id');
      expect(fields).toContain('total_amount');
      expect(fields).toContain('status');
    });

    test('应该拒绝不存在的表名', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/table-schemas/name/nonexistent', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('表不存在');
    });
  });

  test.describe('权限测试', () => {
    test('不同角色用户都应该能获取表结构', async () => {
      const adminUser = await createTestUser('admin', true);
      const regularUser = await createTestUser('user', true);
      const reviewerUser = await createTestUser('reviewer', true);

      const adminResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(adminUser.token),
      });
      expect(adminResponse.status()).toBe(200);

      const userResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(regularUser.token),
      });
      expect(userResponse.status()).toBe(200);

      const reviewerResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(reviewerUser.token),
      });
      expect(reviewerResponse.status()).toBe(200);
    });
  });
});
