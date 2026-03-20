const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  createAPIContext,
  getAuthHeaders,
  createTestUser,
  createRegularUser,
  getAdminToken,
} = require(path.join(__dirname, 'utils', 'apiHelper'));

test.describe('申请表管理API测试', () => {
  let apiContext;
  let adminToken;

  test.beforeAll(async () => {
    apiContext = await createAPIContext();
    adminToken = await getAdminToken();
  });

  test.describe('POST /api/applications - 创建申请表', () => {
    test('应该成功创建新表申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'test_table_new',
          title: '新建测试表',
          description: '这是一个测试表',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
              is_nullable: false,
              is_primary_key: true,
              field_comment: 'ID',
            },
            {
              change_type: 'add',
              field_name: 'name',
              field_type: 'VARCHAR',
              field_length: 100,
              is_nullable: false,
              field_comment: '名称',
            },
          ],
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('申请提交成功');
      expect(body.applicationId).toBeDefined();
    });

    test('应该成功创建修改表申请', async () => {
      const user = await createTestUser('user', true);

      const tablesResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });
      const tables = await tablesResponse.json();
      const usersTable = tables.find(t => t.table_name === 'users');

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'modify_table',
          target_table_id: usersTable.id,
          target_table_name: 'users',
          title: '添加新字段到users表',
          description: '添加测试字段',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'test_field',
              field_type: 'VARCHAR',
              field_length: 50,
              is_nullable: true,
              field_comment: '测试字段',
            },
          ],
        },
      });

      expect(response.status()).toBe(201);
    });

    test('应该拒绝缺少必填字段的申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('申请类型、目标表名和标题为必填项');
    });

    test('应该拒绝无效的申请类型', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'invalid_type',
          target_table_name: 'test_table',
          title: '测试申请',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('无效的申请类型');
    });

    test('修改表申请必须指定目标表', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'modify_table',
          target_table_name: 'users',
          title: '测试申请',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'test_field',
              field_type: 'VARCHAR',
            },
          ],
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('修改表申请必须选择目标表');
    });

    test('应该拒绝没有字段变更的申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'test_table',
          title: '测试申请',
          fieldChanges: [],
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('至少需要包含一个字段变更');
    });

    test('未登录用户不应该能创建申请', async () => {
      const response = await apiContext.post('/api/applications', {
        data: {
          application_type: 'new_table',
          target_table_name: 'test_table',
          title: '测试申请',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
            },
          ],
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/applications - 获取申请列表', () => {
    test('应该成功获取所有申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const applications = await response.json();
      expect(Array.isArray(applications)).toBe(true);
    });

    test('应该能按状态筛选申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/applications?status=pending', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const applications = await response.json();
      
      for (const app of applications) {
        expect(app.status).toBe('pending');
      }
    });

    test('应该能按申请人筛选申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get(`/api/applications?applicant_id=${user.user.id}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const applications = await response.json();
      
      for (const app of applications) {
        expect(app.applicant_id).toBe(user.user.id);
      }
    });

    test('应该返回申请人的详细信息', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const applications = await response.json();
      
      if (applications.length > 0) {
        expect(applications[0].applicant_name).toBeDefined();
        expect(applications[0].applicant_email).toBeDefined();
      }
    });

    test('未登录用户不应该能获取申请列表', async () => {
      const response = await apiContext.get('/api/applications');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/applications/:id - 获取申请详情', () => {
    test('应该成功获取申请详情', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'detail_test_table',
          title: '测试详情申请',
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
      const createData = await createResponse.json();

      const response = await apiContext.get(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const application = await response.json();
      expect(application.id).toBe(createData.applicationId);
      expect(application.title).toBe('测试详情申请');
      expect(application.fieldChanges).toBeDefined();
      expect(Array.isArray(application.fieldChanges)).toBe(true);
    });

    test('应该返回字段变更的详细信息', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'fields_detail_test',
          title: '字段详情测试',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'username',
              field_type: 'VARCHAR',
              field_length: 50,
              is_nullable: false,
              default_value: 'test',
              field_comment: '用户名',
            },
          ],
        },
      });
      const createData = await createResponse.json();

      const response = await apiContext.get(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const application = await response.json();
      
      expect(application.fieldChanges.length).toBeGreaterThan(0);
      const fieldChange = application.fieldChanges[0];
      expect(fieldChange.field_name).toBe('username');
      expect(fieldChange.field_type).toBe('VARCHAR');
      expect(fieldChange.field_length).toBe(50);
    });

    test('应该拒绝不存在的申请ID', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.get('/api/applications/99999', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('申请不存在');
    });
  });

  test.describe('PUT /api/applications/:id/review - 审核申请', () => {
    test('审核员应该能够批准申请', async () => {
      const user = await createTestUser('user', true);
      const reviewer = await createTestUser('reviewer', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'review_test_table',
          title: '审核测试申请',
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
      const createData = await createResponse.json();

      const response = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(reviewer.token),
        data: {
          status: 'approved',
          review_comment: '同意创建',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('审核完成');
    });

    test('管理员应该能够批准申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'admin_review_test',
          title: '管理员审核测试',
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
      const createData = await createResponse.json();

      const response = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(adminToken),
        data: {
          status: 'approved',
        },
      });

      expect(response.status()).toBe(200);
    });

    test('普通用户不应该能审核申请', async () => {
      const user = await createTestUser('user', true);
      const anotherUser = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'unauthorized_review',
          title: '未授权审核测试',
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
      const createData = await createResponse.json();

      const response = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(anotherUser.token),
        data: {
          status: 'approved',
        },
      });

      expect(response.status()).toBe(403);
    });

    test('应该拒绝无效的审核状态', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'invalid_status_test',
          title: '无效状态测试',
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
      const createData = await createResponse.json();

      const response = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(adminToken),
        data: {
          status: 'invalid_status',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('无效的审核状态');
    });

    test('应该拒绝已审核的申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'already_reviewed_test',
          title: '已审核测试',
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
      const createData = await createResponse.json();

      await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(adminToken),
        data: {
          status: 'approved',
        },
      });

      const secondReviewResponse = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(adminToken),
        data: {
          status: 'rejected',
        },
      });

      expect(secondReviewResponse.status()).toBe(400);
      const body = await secondReviewResponse.json();
      expect(body.error).toBe('该申请已经被审核');
    });

    test('审核员应该能够拒绝申请', async () => {
      const user = await createTestUser('user', true);
      const reviewer = await createTestUser('reviewer', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'reject_test_table',
          title: '拒绝测试申请',
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
      const createData = await createResponse.json();

      const response = await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(reviewer.token),
        data: {
          status: 'rejected',
          review_comment: '拒绝原因：字段定义不规范',
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('DELETE /api/applications/:id - 删除申请', () => {
    test('申请人应该能够删除待审核的申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'delete_test_table',
          title: '删除测试申请',
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
      const createData = await createResponse.json();

      const response = await apiContext.delete(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('申请删除成功');
    });

    test('管理员应该能够删除任何待审核的申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'admin_delete_test',
          title: '管理员删除测试',
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
      const createData = await createResponse.json();

      const response = await apiContext.delete(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(adminToken),
      });

      expect(response.status()).toBe(200);
    });

    test('不能删除已审核的申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'cannot_delete_test',
          title: '无法删除测试',
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
      const createData = await createResponse.json();

      await apiContext.put(`/api/applications/${createData.applicationId}/review`, {
        headers: getAuthHeaders(adminToken),
        data: {
          status: 'approved',
        },
      });

      const deleteResponse = await apiContext.delete(`/api/applications/${createData.applicationId}`, {
        headers: getAuthHeaders(user.token),
      });

      expect(deleteResponse.status()).toBe(400);
      const body = await deleteResponse.json();
      expect(body.error).toBe('只能删除待审核的申请');
    });

    test('不能删除不存在的申请', async () => {
      const user = await createTestUser('user', true);

      const response = await apiContext.delete('/api/applications/99999', {
        headers: getAuthHeaders(user.token),
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('申请不存在');
    });

    test('未登录用户不应该能删除申请', async () => {
      const user = await createTestUser('user', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'unauthorized_delete',
          title: '未授权删除测试',
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
      const createData = await createResponse.json();

      const response = await apiContext.delete(`/api/applications/${createData.applicationId}`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('完整的申请审批流程测试', () => {
    test('应该能够完成从创建到审批的完整流程', async () => {
      const user = await createTestUser('user', true);
      const reviewer = await createTestUser('reviewer', true);

      const createResponse = await apiContext.post('/api/applications', {
        headers: getAuthHeaders(user.token),
        data: {
          application_type: 'new_table',
          target_table_name: 'full_flow_test',
          title: '完整流程测试',
          description: '测试完整的申请审批流程',
          fieldChanges: [
            {
              change_type: 'add',
              field_name: 'id',
              field_type: 'INTEGER',
              is_nullable: false,
              is_primary_key: true,
              field_comment: '主键ID',
            },
            {
              change_type: 'add',
              field_name: 'username',
              field_type: 'VARCHAR',
              field_length: 50,
              is_nullable: false,
              field_comment: '用户名',
            },
          ],
        },
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      const applicationId = createData.applicationId;

      const listResponse = await apiContext.get('/api/applications', {
        headers: getAuthHeaders(user.token),
      });
      expect(listResponse.status()).toBe(200);

      const detailResponse = await apiContext.get(`/api/applications/${applicationId}`, {
        headers: getAuthHeaders(user.token),
      });
      expect(detailResponse.status()).toBe(200);
      const detail = await detailResponse.json();
      expect(detail.fieldChanges.length).toBe(2);

      const reviewResponse = await apiContext.put(`/api/applications/${applicationId}/review`, {
        headers: getAuthHeaders(reviewer.token),
        data: {
          status: 'approved',
          review_comment: '同意创建新表',
        },
      });
      expect(reviewResponse.status()).toBe(200);

      const tablesResponse = await apiContext.get('/api/table-schemas', {
        headers: getAuthHeaders(user.token),
      });
      expect(tablesResponse.status()).toBe(200);
      const tables = await tablesResponse.json();
      const newTable = tables.find(t => t.table_name === 'full_flow_test');
      expect(newTable).toBeDefined();
    });
  });
});
