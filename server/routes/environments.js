const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    await db.getUsersDb();
    const environments = db.allUsers('SELECT * FROM environments ORDER BY is_default DESC, created_at ASC');
    res.json(environments);
  } catch (error) {
    console.error('获取环境列表错误:', error);
    res.status(500).json({ error: '获取环境列表失败' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await db.getUsersDb();
    const { id } = req.params;
    const environment = db.getUsers('SELECT * FROM environments WHERE id = ?', [id]);
    if (!environment) {
      return res.status(404).json({ error: '环境不存在' });
    }
    res.json(environment);
  } catch (error) {
    console.error('获取环境详情错误:', error);
    res.status(500).json({ error: '获取环境详情失败' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const { name, description, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ error: '环境名称为必填项' });
    }

    const existing = db.getUsers('SELECT id FROM environments WHERE name = ?', [name]);
    if (existing) {
      return res.status(400).json({ error: '环境名称已存在' });
    }

    if (is_default) {
      db.runUsers('UPDATE environments SET is_default = 0');
    }

    const result = db.runUsers(
      'INSERT INTO environments (name, description, is_default) VALUES (?, ?, ?)',
      [name, description || null, is_default ? 1 : 0]
    );

    await db.getEnvDb(result.lastInsertRowid);

    res.status(201).json({
      message: '环境创建成功',
      environmentId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('创建环境错误:', error);
    res.status(500).json({ error: '创建环境失败' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const { id } = req.params;
    const { name, description, is_default } = req.body;

    const environment = db.getUsers('SELECT * FROM environments WHERE id = ?', [id]);
    if (!environment) {
      return res.status(404).json({ error: '环境不存在' });
    }

    if (name && name !== environment.name) {
      const existing = db.getUsers('SELECT id FROM environments WHERE name = ? AND id != ?', [name, id]);
      if (existing) {
        return res.status(400).json({ error: '环境名称已存在' });
      }
    }

    if (is_default) {
      db.runUsers('UPDATE environments SET is_default = 0');
    }

    db.runUsers(
      'UPDATE environments SET name = ?, description = ?, is_default = ?, updated_at = datetime("now") WHERE id = ?',
      [name || environment.name, description !== undefined ? description : environment.description, is_default ? 1 : 0, id]
    );

    res.json({ message: '环境更新成功' });
  } catch (error) {
    console.error('更新环境错误:', error);
    res.status(500).json({ error: '更新环境失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const { id } = req.params;

    const environment = db.getUsers('SELECT * FROM environments WHERE id = ?', [id]);
    if (!environment) {
      return res.status(404).json({ error: '环境不存在' });
    }

    const count = db.getUsers('SELECT COUNT(*) as count FROM environments');
    if (count.count <= 1) {
      return res.status(400).json({ error: '至少需要保留一个环境' });
    }

    db.runUsers('DELETE FROM environments WHERE id = ?', [id]);

    const fs = require('fs');
    const path = require('path');
    const envDbPath = path.join(db.dataDir, `env_${id}.db`);
    if (fs.existsSync(envDbPath)) {
      fs.unlinkSync(envDbPath);
    }

    res.json({ message: '环境删除成功' });
  } catch (error) {
    console.error('删除环境错误:', error);
    res.status(500).json({ error: '删除环境失败' });
  }
});

router.get('/default', authenticateToken, async (req, res) => {
  try {
    await db.getUsersDb();
    let environment = db.getUsers('SELECT * FROM environments WHERE is_default = 1');
    
    if (!environment) {
      const result = db.runUsers(
        'INSERT INTO environments (name, description, is_default) VALUES (?, ?, ?)',
        ['默认环境', '系统默认环境', 1]
      );
      await db.getEnvDb(result.lastInsertRowid);
      environment = db.getUsers('SELECT * FROM environments WHERE id = ?', [result.lastInsertRowid]);
    }

    res.json(environment);
  } catch (error) {
    console.error('获取默认环境错误:', error);
    res.status(500).json({ error: '获取默认环境失败' });
  }
});

module.exports = router;
