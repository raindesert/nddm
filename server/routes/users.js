const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const users = db.allUsers('SELECT id, email, name, role, is_verified, created_at FROM users');
    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.put('/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const { id } = req.params;
    const { is_verified, role } = req.body;

    const user = db.getUsers('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    db.runUsers('UPDATE users SET is_verified = ?, role = ?, updated_at = datetime("now") WHERE id = ?',
      [is_verified ? 1 : 0, role || user.role, id]);

    res.json({ message: '用户状态更新成功' });
  } catch (error) {
    console.error('更新用户状态错误:', error);
    res.status(500).json({ error: '更新用户状态失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.getUsersDb();
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    const user = db.getUsers('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    db.runUsers('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
