const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const usersDbPath = path.join(dataDir, 'users.db');

let SQL = null;
let usersDb = null;
const envDbs = {};

async function initSqlJsOnce() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

async function getUsersDb() {
  if (usersDb) return usersDb;
  
  await initSqlJsOnce();
  
  if (fs.existsSync(usersDbPath)) {
    const fileBuffer = fs.readFileSync(usersDbPath);
    usersDb = new SQL.Database(fileBuffer);
  } else {
    usersDb = new SQL.Database();
  }
  
  usersDb.run(`
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
  
  usersDb.run(`
    CREATE TABLE IF NOT EXISTS environments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  saveUsersDb();
  
  return usersDb;
}

function saveUsersDb() {
  if (usersDb) {
    const data = usersDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(usersDbPath, buffer);
  }
}

function getEnvDbPath(envId) {
  return path.join(dataDir, `env_${envId}.db`);
}

async function getEnvDb(envId) {
  if (envDbs[envId]) return envDbs[envId];
  
  await initSqlJsOnce();
  
  const dbPath = getEnvDbPath(envId);
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    envDbs[envId] = new SQL.Database(fileBuffer);
  } else {
    envDbs[envId] = new SQL.Database();
  }
  
  initEnvDbTables(envDbs[envId]);
  saveEnvDb(envId);
  
  return envDbs[envId];
}

function initEnvDbTables(db) {
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
}

function saveEnvDb(envId) {
  if (envDbs[envId]) {
    const data = envDbs[envId].export();
    const buffer = Buffer.from(data);
    const dbPath = getEnvDbPath(envId);
    fs.writeFileSync(dbPath, buffer);
  }
}

function run(db, sql, params = [], saveFn) {
  try {
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const changes = db.getRowsModified();
    const lastId = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null;
    
    if (saveFn) saveFn();
    return { lastInsertRowid: lastId, changes };
  } catch (error) {
    console.error('SQL执行错误:', error);
    console.error('SQL:', sql);
    console.error('参数:', params);
    throw error;
  }
}

function get(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function runUsers(sql, params = []) {
  return run(usersDb, sql, params, saveUsersDb);
}

function getUsers(sql, params = []) {
  return get(usersDb, sql, params);
}

function allUsers(sql, params = []) {
  return all(usersDb, sql, params);
}

function runEnv(envId, sql, params = []) {
  const db = envDbs[envId];
  if (!db) throw new Error(`环境数据库 ${envId} 未初始化`);
  return run(db, sql, params, () => saveEnvDb(envId));
}

function getEnv(envId, sql, params = []) {
  const db = envDbs[envId];
  if (!db) throw new Error(`环境数据库 ${envId} 未初始化`);
  return get(db, sql, params);
}

function allEnv(envId, sql, params = []) {
  const db = envDbs[envId];
  if (!db) throw new Error(`环境数据库 ${envId} 未初始化`);
  return all(db, sql, params);
}

module.exports = {
  getUsersDb,
  saveUsersDb,
  getEnvDb,
  saveEnvDb,
  runUsers,
  getUsers,
  allUsers,
  runEnv,
  getEnv,
  allEnv,
  dataDir
};
