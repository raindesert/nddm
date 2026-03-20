const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const tables = db.all(`
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
    await db.getDb();
    const { id } = req.params;
    const table = db.get('SELECT * FROM table_schemas WHERE id = ?', [id]);
    if (!table) {
      return res.status(404).json({ error: '表不存在' });
    }

    const fields = db.all('SELECT * FROM table_fields WHERE table_schema_id = ? ORDER BY id', [id]);
    res.json({ ...table, fields });
  } catch (error) {
    console.error('获取表结构详情错误:', error);
    res.status(500).json({ error: '获取表结构详情失败' });
  }
});

router.get('/name/:tableName', authenticateToken, async (req, res) => {
  try {
    await db.getDb();
    const { tableName } = req.params;
    const table = db.get('SELECT * FROM table_schemas WHERE table_name = ?', [tableName]);
    if (!table) {
      return res.status(404).json({ error: '表不存在' });
    }

    const fields = db.all('SELECT * FROM table_fields WHERE table_schema_id = ? ORDER BY id', [table.id]);
    res.json({ ...table, fields });
  } catch (error) {
    console.error('获取表结构详情错误:', error);
    res.status(500).json({ error: '获取表结构详情失败' });
  }
});

module.exports = router;
