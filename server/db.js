/**
 * MySQL Database Connection Pool
 * 
 * Connects to the XAMPP MySQL/MariaDB instance using credentials
 * from server/.env. Uses a connection pool for efficient handling
 * of concurrent requests.
 */
import './env.js';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATE columns as plain strings ('YYYY-MM-DD') without timezone shifting
  dateStrings: ['DATE'],
  // Prevent hanging on startup if MySQL is down
  connectTimeout: 10000,
});

/**
 * Test the database connection.
 * Returns { success, message } — never throws.
 */
export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    return { success: true, message: 'Database connection successful' };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    if (connection) connection.release();
  }
}

export default pool;
