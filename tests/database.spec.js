const { test, expect, describe } = require('@playwright/test');
const db = require('../server/db');

describe('数据库操作测试', () => {
  test.beforeAll(async () => {
    await db.getDb();
  });

  describe('用户表操作', () => {
    test('应该能够查询用户', async () => {
      const user = db.get("SELECT * FROM users WHERE role = 'admin'");
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
      expect(user.role).toBe('admin');
    });

    test('应该能够获取所有用户', async () => {
      const users = db.all('SELECT * FROM users');
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    test('应该能够通过邮箱查找用户', async () => {
      const user = db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
    });

    test('查找不存在的用户应返回undefined', async () => {
      const user = db.get('SELECT * FROM users WHERE email = ?', ['nonexistent@example.com']);
      expect(user).toBeUndefined();
    });
  });

  describe('表结构表操作', () => {
    test('应该能够查询所有表结构', async () => {
      const tables = db.all('SELECT * FROM table_schemas');
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThanOrEqual(3);
    });

    test('应该能够通过表名查询表结构', async () => {
      const table = db.get('SELECT * FROM table_schemas WHERE table_name = ?', ['users']);
      expect(table).toBeDefined();
      expect(table.table_name).toBe('users');
    });

    test('应该能够获取表的字段', async () => {
      const table = db.get('SELECT * FROM table_schemas WHERE table_name = ?', ['users']);
      const fields = db.all('SELECT * FROM table_fields WHERE table_schema_id = ?', [table.id]);
      
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      
      const idField = fields.find(f => f.field_name === 'id');
      expect(idField).toBeDefined();
      expect(idField.is_primary_key).toBe(1);
    });

    test('应该能够统计每个表的字段数量', async () => {
      const tables = db.all(`
        SELECT ts.*, 
          (SELECT COUNT(*) FROM table_fields WHERE table_schema_id = ts.id) as field_count
        FROM table_schemas ts
      `);
      
      const usersTable = tables.find(t => t.table_name === 'users');
      expect(usersTable.field_count).toBeGreaterThan(0);
    });
  });

  describe('申请表操作', () => {
    test('应该能够查询所有申请', async () => {
      const applications = db.all('SELECT * FROM schema_applications');
      expect(Array.isArray(applications)).toBe(true);
    });

    test('应该能够通过状态筛选申请', async () => {
      const pendingApplications = db.all("SELECT * FROM schema_applications WHERE status = 'pending'");
      expect(Array.isArray(pendingApplications)).toBe(true);
      
      for (const app of pendingApplications) {
        expect(app.status).toBe('pending');
      }
    });

    test('应该能够获取申请的字段变更', async () => {
      const applications = db.all('SELECT * FROM schema_applications LIMIT 1');
      
      if (applications.length > 0) {
        const applicationId = applications[0].id;
        const fieldChanges = db.all('SELECT * FROM application_field_changes WHERE application_id = ?', [applicationId]);
        expect(Array.isArray(fieldChanges)).toBe(true);
      }
    });
  });

  describe('数据库写入操作', () => {
    test('应该能够创建新用户', async () => {
      const timestamp = Date.now();
      const email = `db_test_${timestamp}@example.com`;
      
      const result = db.run(
        'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        [email, 'hashedpassword', 'DB测试用户', 'user', 1]
      );
      
      expect(result.lastInsertRowid).toBeDefined();
      expect(result.changes).toBe(1);
      
      const newUser = db.get('SELECT * FROM users WHERE email = ?', [email]);
      expect(newUser).toBeDefined();
      expect(newUser.email).toBe(email);
      expect(newUser.name).toBe('DB测试用户');
    });

    test('应该能够更新用户信息', async () => {
      const timestamp = Date.now();
      const email = `update_test_${timestamp}@example.com`;
      
      db.run(
        'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        [email, 'password', '原始名称', 'user', 1]
      );
      
      const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      db.run('UPDATE users SET name = ?, role = ? WHERE id = ?', ['新名称', 'reviewer', user.id]);
      
      const updatedUser = db.get('SELECT * FROM users WHERE id = ?', [user.id]);
      expect(updatedUser.name).toBe('新名称');
      expect(updatedUser.role).toBe('reviewer');
    });

    test('应该能够删除用户', async () => {
      const timestamp = Date.now();
      const email = `delete_test_${timestamp}@example.com`;
      
      db.run(
        'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        [email, 'password', '待删除用户', 'user', 1]
      );
      
      const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      db.run('DELETE FROM users WHERE id = ?', [user.id]);
      
      const deletedUser = db.get('SELECT * FROM users WHERE id = ?', [user.id]);
      expect(deletedUser).toBeUndefined();
    });
  });

  describe('数据完整性测试', () => {
    test('用户邮箱应该唯一', async () => {
      const timestamp = Date.now();
      const email = `unique_test_${timestamp}@example.com`;
      
      db.run(
        'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        [email, 'password', '用户1', 'user', 1]
      );
      
      let errorOccurred = false;
      try {
        db.run(
          'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
          [email, 'password', '用户2', 'user', 1]
        );
      } catch (error) {
        errorOccurred = true;
      }
      
      expect(errorOccurred).toBe(true);
    });

    test('表名应该唯一', async () => {
      const tableName = 'unique_table_test';
      
      db.run(
        'INSERT INTO table_schemas (table_name, table_comment) VALUES (?, ?)',
        [tableName, '测试表1']
      );
      
      const table = db.get('SELECT * FROM table_schemas WHERE table_name = ?', [tableName]);
      
      let errorOccurred = false;
      try {
        db.run(
          'INSERT INTO table_schemas (table_name, table_comment) VALUES (?, ?)',
          [tableName, '测试表2']
        );
      } catch (error) {
        errorOccurred = true;
      }
      
      expect(errorOccurred).toBe(true);
    });
  });

  describe('数据库统计测试', () => {
    test('应该能够统计用户总数', async () => {
      const users = db.all('SELECT * FROM users');
      expect(users.length).toBeGreaterThan(0);
    });

    test('应该能够统计表结构总数', async () => {
      const tables = db.all('SELECT * FROM table_schemas');
      expect(tables.length).toBeGreaterThanOrEqual(3);
    });

    test('应该能够统计待审核申请数', async () => {
      const applications = db.all("SELECT * FROM schema_applications WHERE status = 'pending'");
      expect(applications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('数据库连接测试', () => {
    test('应该能够获取数据库连接', async () => {
      const database = await db.getDb();
      expect(database).toBeDefined();
    });

    test('应该能够保存数据库', () => {
      expect(() => db.saveDb()).not.toThrow();
    });

    test('应该能够执行原生SQL', () => {
      expect(() => db.exec('SELECT 1')).not.toThrow();
    });
  });

  describe('边界情况测试', () => {
    test('空参数数组应该正常工作', async () => {
      const users = db.all('SELECT * FROM users WHERE 1=1', []);
      expect(Array.isArray(users)).toBe(true);
    });

    test('null参数应该正常工作', async () => {
      const tables = db.all('SELECT * FROM table_schemas WHERE table_comment IS NULL OR table_comment = ?', [null]);
      expect(Array.isArray(tables)).toBe(true);
    });

    test('LIKE查询应该正常工作', async () => {
      const users = db.all('SELECT * FROM users WHERE email LIKE ?', ['%@example.com']);
      expect(Array.isArray(users)).toBe(true);
    });

    test('LIMIT和OFFSET应该正常工作', async () => {
      const users = db.all('SELECT * FROM users LIMIT 2 OFFSET 0');
      expect(users.length).toBeLessThanOrEqual(2);
    });

    test('ORDER BY应该正常工作', async () => {
      const users = db.all('SELECT * FROM users ORDER BY created_at DESC');
      expect(users.length).toBeGreaterThan(1);
    });
  });
});
