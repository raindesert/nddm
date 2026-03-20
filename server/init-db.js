const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.db');

async function initDatabase() {
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS table_schemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL UNIQUE,
      table_comment TEXT,
      database_name TEXT DEFAULT 'main',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS table_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_schema_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL,
      field_length INTEGER,
      is_nullable INTEGER DEFAULT 1,
      default_value TEXT,
      field_comment TEXT,
      is_primary_key INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_schema_id) REFERENCES table_schemas(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schema_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL,
      application_type TEXT NOT NULL,
      target_table_id INTEGER,
      target_table_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_id INTEGER,
      review_comment TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (target_table_id) REFERENCES table_schemas(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS application_field_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT,
      field_length INTEGER,
      is_nullable INTEGER,
      default_value TEXT,
      field_comment TEXT,
      is_primary_key INTEGER,
      old_field_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES schema_applications(id) ON DELETE CASCADE
    )
  `);

  const adminResult = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (adminResult.length === 0 || adminResult[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)`,
      ['admin@example.com', hashedPassword, '系统管理员', 'admin', 1]);
    console.log('默认管理员账户已创建: admin@example.com / admin123');
  }

  const sampleTables = [
    { name: 'users', comment: '用户表' },
    { name: 'orders', comment: '订单表' },
    { name: 'products', comment: '产品表' }
  ];

  const sampleFields = {
    'users': [
      { field_name: 'id', field_type: 'INTEGER', is_nullable: 0, is_primary_key: 1, field_comment: '用户ID' },
      { field_name: 'username', field_type: 'VARCHAR', field_length: 50, is_nullable: 0, field_comment: '用户名' },
      { field_name: 'email', field_type: 'VARCHAR', field_length: 100, is_nullable: 0, field_comment: '邮箱' },
      { field_name: 'created_at', field_type: 'DATETIME', is_nullable: 1, field_comment: '创建时间' }
    ],
    'orders': [
      { field_name: 'id', field_type: 'INTEGER', is_nullable: 0, is_primary_key: 1, field_comment: '订单ID' },
      { field_name: 'user_id', field_type: 'INTEGER', is_nullable: 0, field_comment: '用户ID' },
      { field_name: 'total_amount', field_type: 'DECIMAL', field_length: 10, is_nullable: 0, field_comment: '总金额' },
      { field_name: 'status', field_type: 'VARCHAR', field_length: 20, is_nullable: 0, field_comment: '订单状态' }
    ],
    'products': [
      { field_name: 'id', field_type: 'INTEGER', is_nullable: 0, is_primary_key: 1, field_comment: '产品ID' },
      { field_name: 'name', field_type: 'VARCHAR', field_length: 100, is_nullable: 0, field_comment: '产品名称' },
      { field_name: 'price', field_type: 'DECIMAL', field_length: 10, is_nullable: 0, field_comment: '价格' },
      { field_name: 'stock', field_type: 'INTEGER', is_nullable: 0, field_comment: '库存' }
    ]
  };

  for (const table of sampleTables) {
    const existingResult = db.exec('SELECT id FROM table_schemas WHERE table_name = ?', [table.name]);
    if (existingResult.length === 0 || existingResult[0].values.length === 0) {
      db.run('INSERT INTO table_schemas (table_name, table_comment) VALUES (?, ?)', [table.name, table.comment]);
      const idResult = db.exec('SELECT last_insert_rowid()');
      const tableId = idResult[0].values[0][0];
      
      const fields = sampleFields[table.name];
      for (const field of fields) {
        db.run(`INSERT INTO table_fields (table_schema_id, field_name, field_type, field_length, is_nullable, is_primary_key, field_comment) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tableId, field.field_name, field.field_type, field.field_length || null, field.is_nullable, field.is_primary_key || 0, field.field_comment]);
      }
      console.log(`示例表 ${table.name} 已创建`);
    }
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  
  console.log('数据库初始化完成！');
  db.close();
}

initDatabase().catch(console.error);
