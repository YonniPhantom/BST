const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH 
  ? path.resolve(__dirname, process.env.DB_PATH)
  : process.env.NODE_ENV === "development"
    ? path.join(__dirname, "../data/dev.db")
    : path.join(__dirname, "../data/app.db");

let db = null;

function getDb() {
  if (!db) {
    // Only check if DB file exists, don't create it
    try {
      if (!fs.existsSync(dbPath)) {
        return null; // DB file doesn't exist
      }
      
      db = new Database(dbPath);
      // Check if tables exist
      const userTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      const registrationTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_registrations'").get();
      if (!userTable || !registrationTable) {
        db.close();
        db = null;
        return null; // DB exists but not initialized
      }
      return db;
    } catch (error) {
      console.error('Database connection error:', error);
      return null;
    }
  }
  return db;
}

function createDb() {
  if (!db) {
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = new Database(dbPath);
  }
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS student_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT NOT NULL,
      nombre TEXT NOT NULL,
      carrera TEXT NOT NULL,
      hora_entrada TEXT NOT NULL,
      fecha_registro DATE NOT NULL,
      tipo_registro TEXT DEFAULT 'Manual',
      file_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert admin user only if it doesn't exist
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingUser) {
    db.exec(`
      INSERT INTO users (username, password) VALUES ('admin', 'admin')
    `);
  }
  
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  createDb,
  closeDb
};
