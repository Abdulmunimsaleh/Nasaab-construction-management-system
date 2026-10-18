/**
 * NASAAB Construction — Unified Database Driver (PostgreSQL & MySQL)
 * 
 * Automatically connects to:
 * 1. PostgreSQL (Default on Render via DATABASE_URL or PG* variables)
 * 2. MySQL (Local development fallback via XAMPP)
 * 
 * Provides an identical [rows, fields] API and translates queries so all
 * existing routes, models, and scripts work seamlessly without changes.
 */
import './env.js';
import pg from 'pg';
import mysql from 'mysql2/promise';

const isPostgres = Boolean(
  process.env.DATABASE_URL ||
  process.env.PGHOST ||
  process.env.DB_TYPE === 'postgres' ||
  (process.env.RENDER && !process.env.DB_HOST)
);

// -------------------------------------------------------------
// A. PostgreSQL Connection Pool
// -------------------------------------------------------------
let pgPool = null;
let mysqlPool = null;

if (isPostgres) {
  const connectionString = process.env.DATABASE_URL;
  const isCloud = connectionString && (connectionString.includes('render.com') || connectionString.includes('neon.tech') || connectionString.includes('railway') || process.env.NODE_ENV === 'production');

  pgPool = new pg.Pool({
    connectionString: connectionString || undefined,
    host: !connectionString ? (process.env.PGHOST || process.env.DB_HOST || '127.0.0.1') : undefined,
    port: !connectionString ? parseInt(process.env.PGPORT || process.env.DB_PORT || 5432, 10) : undefined,
    database: !connectionString ? (process.env.PGDATABASE || process.env.DB_NAME || 'nasaab_construction') : undefined,
    user: !connectionString ? (process.env.PGUSER || process.env.DB_USER || 'postgres') : undefined,
    password: !connectionString ? (process.env.PGPASSWORD || process.env.DB_PASSWORD) : undefined,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Ensure DATE columns are returned as plain 'YYYY-MM-DD' strings like MySQL
  pg.types.setTypeParser(1082, (val) => val);
} else {
  // -------------------------------------------------------------
  // B. MySQL Local Fallback
  // -------------------------------------------------------------
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'nasaab_construction',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: ['DATE'],
    connectTimeout: 10000,
  });
}

/**
 * Translates MySQL-flavored SQL into standard PostgreSQL SQL.
 */
function translateToPgSql(sql) {
  let i = 1;
  // Convert ? parameter placeholders to $1, $2, $3...
  let converted = sql.replace(/\?/g, () => `$${i++}`);

  // Convert MySQL backticks `table` to standard quotes
  converted = converted.replace(/`([a-zA-Z0-9_]+)`/g, '"$1"');

  // Translate MySQL ON DUPLICATE KEY UPDATE:
  // 1. project_user_assignments
  if (converted.includes('project_user_assignments') && /ON DUPLICATE KEY UPDATE/i.test(converted)) {
    converted = converted.replace(
      /ON DUPLICATE KEY UPDATE.*/is,
      'ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP'
    );
  }

  // 2. company_settings
  if (converted.includes('company_settings') && /ON DUPLICATE KEY UPDATE/i.test(converted)) {
    converted = converted.replace(
      /ON DUPLICATE KEY UPDATE.*/is,
      `ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        nca_registration = EXCLUDED.nca_registration,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        website = EXCLUDED.website,
        pdf_logo_text = EXCLUDED.pdf_logo_text,
        updated_at = CURRENT_TIMESTAMP`
    );
  }

  return converted;
}

/**
 * Universal pool wrapper matching MySQL2 promise signature [rows, fields]
 */
export const pool = {
  isPostgres,

  async query(sql, params = []) {
    if (isPostgres) {
      const pgSql = translateToPgSql(sql);
      const res = await pgPool.query(pgSql, params);
      const rows = res.rows || [];
      rows.affectedRows = res.rowCount;
      rows.insertId = rows[0]?.id;
      return [rows, res.fields];
    } else {
      return mysqlPool.query(sql, params);
    }
  },

  async getConnection() {
    if (isPostgres) {
      const client = await pgPool.connect();
      return {
        query: async (sql, params = []) => {
          const pgSql = translateToPgSql(sql);
          const res = await client.query(pgSql, params);
          const rows = res.rows || [];
          rows.affectedRows = res.rowCount;
          rows.insertId = rows[0]?.id;
          return [rows, res.fields];
        },
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release(),
        ping: () => client.query('SELECT 1'),
      };
    } else {
      return mysqlPool.getConnection();
    }
  }
};

/**
 * Health check test connection
 */
export async function testConnection() {
  try {
    if (isPostgres) {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      const dbTarget = process.env.DATABASE_URL
        ? 'Cloud PostgreSQL (Render)'
        : `${process.env.PGDATABASE || process.env.DB_NAME || 'postgres'}@${process.env.PGHOST || 'PostgreSQL'}`;
      return { success: true, message: `PostgreSQL connection successful (${dbTarget})` };
    } else {
      const connection = await mysqlPool.getConnection();
      await connection.ping();
      connection.release();
      return { success: true, message: `MySQL connection successful (${process.env.DB_NAME}@${process.env.DB_HOST})` };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export default pool;
