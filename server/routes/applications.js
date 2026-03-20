const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireReviewer } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const { status, applicant_id } = req.query;
    let query = `
      SELECT sa.*, 
        u.name as applicant_name, u.email as applicant_email,
        r.name as reviewer_name
      FROM schema_applications sa
      LEFT JOIN users u ON sa.applicant_id = u.id
      LEFT JOIN users r ON sa.reviewer_id = r.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('sa.status = ?');
      params.push(status);
    }

    if (applicant_id) {
      conditions.push('sa.applicant_id = ?');
      params.push(applicant_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sa.created_at DESC';

    const applications = db.all(query, params);
    res.json(applications);
  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({ error: '获取申请列表失败' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const { id } = req.params;
    const application = db.get(`
      SELECT sa.*, 
        u.name as applicant_name, u.email as applicant_email,
        r.name as reviewer_name
      FROM schema_applications sa
      LEFT JOIN users u ON sa.applicant_id = u.id
      LEFT JOIN users r ON sa.reviewer_id = r.id
      WHERE sa.id = ?
    `, [id]);

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    const fieldChanges = db.all('SELECT * FROM application_field_changes WHERE application_id = ? ORDER BY id', [id]);
    res.json({ ...application, fieldChanges });
  } catch (error) {
    console.error('获取申请详情错误:', error);
    res.status(500).json({ error: '获取申请详情失败' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const { application_type, target_table_id, target_table_name, title, description, fieldChanges } = req.body;

    if (!application_type || !target_table_name || !title) {
      return res.status(400).json({ error: '申请类型、目标表名和标题为必填项' });
    }

    if (!['new_table', 'modify_table'].includes(application_type)) {
      return res.status(400).json({ error: '无效的申请类型' });
    }

    if (application_type === 'modify_table' && !target_table_id) {
      return res.status(400).json({ error: '修改表申请必须选择目标表' });
    }

    if (!fieldChanges || fieldChanges.length === 0) {
      return res.status(400).json({ error: '至少需要包含一个字段变更' });
    }

    const result = db.run(`
      INSERT INTO schema_applications (applicant_id, application_type, target_table_id, target_table_name, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
    `, [req.user.id, application_type, target_table_id || null, target_table_name, title, description || null]);

    const applicationId = result.lastInsertRowid;

    for (const change of fieldChanges) {
      if (!change.change_type || !change.field_name) {
        continue;
      }
      
      db.run(`
        INSERT INTO application_field_changes 
        (application_id, change_type, field_name, field_type, field_length, is_nullable, default_value, field_comment, is_primary_key, old_field_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))
      `, [
        applicationId,
        change.change_type,
        change.field_name,
        change.field_type || null,
        change.field_length || null,
        change.is_nullable !== undefined ? (change.is_nullable ? 1 : 0) : 1,
        change.default_value || null,
        change.field_comment || null,
        change.is_primary_key ? 1 : 0,
        change.old_field_name || null
      ]);
    }

    res.status(201).json({
      message: '申请提交成功',
      applicationId
    });
  } catch (error) {
    console.error('提交申请错误:', error);
    res.status(500).json({ error: '提交申请失败' });
  }
});

router.put('/:id/review', authenticateToken, requireReviewer, async (req, res) => {
  try {
    await db.getDb();
    const { id } = req.params;
    const { status, review_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }

    const application = db.get(`
      SELECT sa.*, 
        u.name as applicant_name
      FROM schema_applications sa
      LEFT JOIN users u ON sa.applicant_id = u.id
      WHERE sa.id = ?
    `, [id]);

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '该申请已经被审核' });
    }

    if (status === 'approved') {
      applySchemaChanges(application);
    }

    db.run(`
      UPDATE schema_applications 
      SET status = ?, reviewer_id = ?, review_comment = ?, reviewed_at = datetime("now"), updated_at = datetime("now")
      WHERE id = ?
    `, [status, req.user.id, review_comment || null, id]);

    res.json({ message: '审核完成' });
  } catch (error) {
    console.error('审核申请错误:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

function applySchemaChanges(application) {
  const fieldChanges = db.all('SELECT * FROM application_field_changes WHERE application_id = ?', [application.id]);

  if (application.application_type === 'new_table') {
    const result = db.run('INSERT INTO table_schemas (table_name, table_comment, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))',
      [application.target_table_name, application.description]);
    const tableId = result.lastInsertRowid;

    for (const change of fieldChanges) {
      if (change.change_type === 'add' && change.field_name && change.field_type) {
        db.run(`
          INSERT INTO table_fields (table_schema_id, field_name, field_type, field_length, is_nullable, default_value, field_comment, is_primary_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
        `, [tableId, change.field_name, change.field_type, change.field_length, change.is_nullable, change.default_value, change.field_comment, change.is_primary_key]);
      }
    }
  } else if (application.application_type === 'modify_table') {
    const table = db.get('SELECT * FROM table_schemas WHERE id = ?', [application.target_table_id]);
    if (!table) {
      throw new Error('目标表不存在');
    }

    for (const change of fieldChanges) {
      if (change.change_type === 'add' && change.field_name && change.field_type) {
        db.run(`
          INSERT INTO table_fields (table_schema_id, field_name, field_type, field_length, is_nullable, default_value, field_comment, is_primary_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
        `, [table.id, change.field_name, change.field_type, change.field_length, change.is_nullable, change.default_value, change.field_comment, change.is_primary_key]);
      } else if (change.change_type === 'modify' && change.field_name && change.old_field_name) {
        db.run(`
          UPDATE table_fields 
          SET field_name = ?, field_type = ?, field_length = ?, is_nullable = ?, default_value = ?, field_comment = ?, is_primary_key = ?, updated_at = datetime("now")
          WHERE table_schema_id = ? AND field_name = ?
        `, [change.field_name, change.field_type, change.field_length, change.is_nullable, change.default_value, change.field_comment, change.is_primary_key, table.id, change.old_field_name]);
      } else if (change.change_type === 'delete' && change.field_name) {
        db.run('DELETE FROM table_fields WHERE table_schema_id = ? AND field_name = ?', [table.id, change.field_name]);
      }
    }

    db.run('UPDATE table_schemas SET updated_at = datetime("now") WHERE id = ?', [table.id]);
  }
}

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const { id } = req.params;
    const application = db.get('SELECT * FROM schema_applications WHERE id = ?', [id]);

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.applicant_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权删除此申请' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '只能删除待审核的申请' });
    }

    db.run('DELETE FROM application_field_changes WHERE application_id = ?', [id]);
    db.run('DELETE FROM schema_applications WHERE id = ?', [id]);
    res.json({ message: '申请删除成功' });
  } catch (error) {
    console.error('删除申请错误:', error);
    res.status(500).json({ error: '删除申请失败' });
  }
});

module.exports = router;
