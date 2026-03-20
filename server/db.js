const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');

let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;
  
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function run(sql, params = []) {
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
    
    saveDb();
    return { lastInsertRowid: lastId, changes };
  } catch (error) {
    console.error('SQL执行错误:', error);
    console.error('SQL:', sql);
    console.error('参数:', params);
    throw error;
  }
}

function get(sql, params = []) {
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

function all(sql, params = []) {
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

function exec(sql) {
  db.run(sql);
  saveDb();
}

module.exports = {
  getDb,
  saveDb,
  run,
  get,
  all,
  exec
};
