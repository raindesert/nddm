const { test, expect, describe } = require('@playwright/test');
const path = require('path');
const {
  createAPIContext,
  getAuthHeaders,
  createTestUser,
  createRegularUser,
  getAdminToken,
} = require(path.join(__dirname, 'utils', 'apiHelper'));

describe('示例：编写自定义测试', () => {
  let apiContext;

  test.beforeEach(async () => {
    apiContext = await createAPIContext();
  });

  test.describe('场景1: 新用户注册和激活流程', () => {
    test('完整的新用户注册激活流程', async () => {
      const timestamp = Date.now();
      const email = `flow_test_${timestamp}@example.com`;

      const registerResponse = await apiContext.post('/api/auth/register', {
        data: {
          email: email,
          password: 'password123',
          name: '流程测试用户',
        },
      });

      expect(registerResponse.status()).toBe(201);

      const loginBeforeVerify = await apiContext.post('/api/auth/login', {
        data: {
          email: email,
          password: 'password123',
        },
      });

      expect(loginBeforeVerify.status()).toBe(401);

      const adminToken = await getAdminToken();
      const usersResponse = await apiContext.get('/api/users', {
        headers: getAuthHeaders(adminToken),
      });
      const users = await usersResponse.json();
      const newUser = users.find(u => u.email === email);

      const verifyResponse = await apiContext.put(`/api/users/${newUser.id}/verify`, {
        headers: getAuthHeaders(adminToken),
        data: {
          is_verified: true,
          role: 'user',
        },
      });

      expect(verifyResponse.status()).toBe(200);

      const loginAfterVerify = await apiContext.post('/api/auth/login', {
        data: {
          email: email,
          password: 'password123',
        },
      });

      expect(loginAfterVerify.status()).toBe(200);
      const loginData = await loginAfterVerify.json();
      expect(loginData.token).toBeDefined();
    });
  });

  test.describe('场景2: 批量创建表结构申请', () => {
    test('应该能够批量创建多个申请', async () => {
      const user = await createTestUser('user', true);
      const tableNames = ['batch_table_1', 'batch_table_2', 'batch_table_3'];
      const applicationIds = [];

      for (const tableName of tableNames) {
        const response = await apiContext.post('/api/applications', {
          headers: getAuthHeaders(user.token),
          data: {
            application_type: 'new_table',
            target_table_name: tableName,
            title: `批量创建 ${tableName}`,
            description: '批量测试申请',
            fieldChanges: [
              {
                change_type: 'add',
                field_name: 'id',
                field_type: 'INTEGER',
                is_nullable: false,
                is_primary_key: true,
              },
              {
                change_type: 'add',
                field_name: 'name',
                field_type: 'VARCHAR',
                field_length: 100,
                is_nullable: false,
              },
            ],
          },
        });

        expect(response.status()).toBe(201);
        const data = await response.json();
        applicationIds.push(data.applicationId);
      }

      const listResponse = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });
      const applications = await listResponse.json();

      const myApplications = applications.filter(app => 
        applicationIds.includes(app.id)
      );

      expect(myApplications.length).toBe(tableNames.length);
    });
  });

  test.describe('场景3: 复杂查询测试', () => {
    test('应该能够组合多个查询条件', async () => {
      const user = await createTestUser('user', true);

      await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'query_test_table',
          title: '查询测试',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
              is_nullable: false,
            },
          ],
        },
      });

      const response1 = await apiContext.get(`/api/applications?applicant_id=${user.user.id}&status=pending`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response1.status()).toBe(200);
      const applications1 = await response1.json();
      
      for (const app of applications1) {
        expect(app.applicant_id).toBe(user.user.id);
        expect(app.status).toBe('pending');
      }
    });
  });

  test.describe('场景4: 性能测试', () => {
    test('API响应时间应该在可接受范围内', async () => {
      const user = await createTestUser('user', true);

      const startTime = Date.now();
      const response = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      const responseTime = endTime - startTime;
      
      console.log(`API响应时间: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(5000);
    });

    test('应该能够处理大量数据', async () => {
      const user = await createTestUser('user', true);

      for (let i = 0; i < 10; i++) {
        await apiContext.post('/api/applications', {
          headers: getAuthHeaders(user.token),
          data: {
            application_type: 'new_table',
            target_table_name: `perf_test_table_${i}`,
            title: `性能测试 ${i}`,
            fieldChanges: [
              {
                change_type: 'add',
                field_name: 'id',
                field_type: 'INTEGER',
                is_nullable: false,
              },
            ],
          },
        });
      }

      const response = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const applications = await response.json();
      expect(applications.length).toBeGreaterThan(0);
    });
  });

  test.describe('场景5: 错误恢复测试', () => {
    test('服务器错误后应该能够恢复', async () => {
      const user = await createTestUser('user', true);

      const invalidResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'invalid_type',
        },
      });

      expect(invalidResponse.status()).toBe(400);

      const validResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'recovery_test',
          title: '恢复测试',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
              is_nullable: false,
            },
          ],
        },
      });

      expect(validResponse.status()).toBe(201);
    });
  });

  test.describe('场景6: 数据一致性测试', () => {
    test('申请创建后数据应该保持一致', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'consistency_test',
          title: '一致性测试',
          description: '测试数据一致性',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
              is_nullable: false,
            },
            {
              change_type: 'add',
              field_name: 'name',
              field_type: 'VARCHAR',
              field_length: 100,
            },
          ],
        },
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();

      const detailResponse = await apiContext.get(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(detailResponse.status()).toBe(200);
      const detail = await detailResponse.json();

      expect(detail.title).toBe('一致性测试');
      expect(detail.description).toBe('测试数据一致性');
      expect(detail.application_type).toBe('new_table');
      expect(detail.target_table_name).toBe('consistency_test');
      expect(detail.fieldChanges.length).toBe(2);
    });
  });
});

describe('示例：高级测试技巧', () => {
  test('并行执行多个API调用', async () => {
    const user = await createTestUser('user', true);
    const apiContext = await createAPIContext();

    const promises = [
      apiContext.get('/api/applications', { headers: getAuthHeaders(user.token) }),
      apiContext.get('/api/table-schemas', { headers: getAuthHeaders(user.token) }),
      apiContext.get('/api/auth/me', { headers: getAuthHeaders(user.token) }),
    ];

    const results = await Promise.all(promises);

    results.forEach((response, index) => {
      expect(response.status()).toBe(200);
    });
  });

  test('重试机制测试', async () => {
    const user = await createTestUser('user', true);
    let attempts = 0;
    let success = false;

    while (attempts < 3 && !success) {
      attempts++;
      const apiContext = await createAPIContext();
      const response = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });

      if (response.status() === 200) {
        success = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    expect(success).toBe(true);
    expect(attempts).toBeLessThanOrEqual(3);
  });

  test('超时处理测试', async ({ page }) => {
    await page.goto('/', { timeout: 10000 });
    await expect(page).toHaveURL(/.*/);
    await expect(page).toHaveTitle(/表结构申请系统/);
  });
});
