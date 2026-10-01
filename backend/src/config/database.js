const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'warehouse.db');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable SQLite WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

// Auto-migrate users columns if created on earlier version
try {
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const colNames = tableInfo.map(c => c.name);
  if (!colNames.includes('email')) {
    db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
  }
  if (!colNames.includes('avatar_url')) {
    db.prepare('ALTER TABLE users ADD COLUMN avatar_url TEXT').run();
  }
  if (!colNames.includes('google_id')) {
    db.prepare('ALTER TABLE users ADD COLUMN google_id TEXT').run();
  }
  if (!colNames.includes('auth_provider')) {
    db.prepare("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'").run();
  }
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
} catch (e) {
  // Ignored if table creation is in progress
}

// Helper to log actions into inventory_logs table
function logActivity(action, entityType, entityId, details, userRole = 'Admin') {
  try {
    const stmt = db.prepare(`
      INSERT INTO inventory_logs (action, entity_type, entity_id, details, user_role)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(action, entityType, entityId, typeof details === 'object' ? JSON.stringify(details) : details, userRole);
  } catch (error) {
    console.error('Failed to write inventory log:', error.message);
  }
}

module.exports = {
  db,
  logActivity
};
