const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/environments', require('./routes/environments'));
app.use('/api/table-schemas', require('./routes/tableSchemas'));
app.use('/api/applications', require('./routes/applications'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.getUsersDb();
    console.log('用户数据库连接成功');
    
    const adminExists = db.getUsers('SELECT id FROM users WHERE role = ?', ['admin']);
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.runUsers(
        'INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        ['admin@example.com', hashedPassword, '系统管理员', 'admin', 1]
      );
      console.log('默认管理员账户已创建: admin@example.com / admin123');
    }
    
    let defaultEnv = db.getUsers('SELECT * FROM environments WHERE is_default = 1');
    if (!defaultEnv) {
      const result = db.runUsers(
        'INSERT INTO environments (name, description, is_default) VALUES (?, ?, ?)',
        ['默认环境', '系统默认环境', 1]
      );
      await db.getEnvDb(result.lastInsertRowid);
      console.log('默认环境已创建');
    }
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`访问地址: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
