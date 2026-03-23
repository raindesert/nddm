const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const envId = req.query.env_id;
    if (!envId) {
      return res.status(400).json({ error: '缺少环境参数' });
    }

    await db.getEnvDb(envId);
    const tables = db.allEnv(envId, `
      SELECT ts.*, 
        (SELECT COUNT(*) FROM table_fields WHERE table_schema_id = ts.id) as field_count
      FROM table_schemas ts
      ORDER BY ts.created_at DESC
    `);
    res.json(tables);
  } catch (error) {
    console.error('获取表结构列表错误:', error);
    res.status(500).json({ error: '获取表结构列表失败' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const envId = req.query.env_id;
    if (!envId) {
      return res.status(400).json({ error: '缺少环境参数' });
    }

    await db.getEnvDb(envId);
    const { id } = req.params;
    const table = db.getEnv(envId, 'SELECT * FROM table_schemas WHERE id = ?', [id]);
    if (!table) {
      return res.status(404).json({ error: '表不存在' });
    }

    const fields = db.allEnv(envId, 'SELECT * FROM table_fields WHERE table_schema_id = ? ORDER BY id', [id]);
    res.json({ ...table, fields });
  } catch (error) {
    console.error('获取表结构详情错误:', error);
    res.status(500).json({ error: '获取表结构详情失败' });
  }
});

module.exports = router;
