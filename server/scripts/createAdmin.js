/**
 * NASAAB Construction — Initial Administrator Provisioning Utility
 * 
 * Securely creates or updates an Administrator account with a custom,
 * bcrypt-hashed password directly in the MySQL database.
 * 
 * Usage:
 *   node server/scripts/createAdmin.js <userId> <username> <email> <password> "<fullName>"
 * 
 * Example:
 *   node server/scripts/createAdmin.js USR-ADMIN admin admin@nasaabconstruction.com StrongPass123 "Eng. Abdulmuniim"
 */
import '../env.js';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  const userId = args[0] || 'USR-001';
  const username = args[1] || 'admin';
  const email = args[2] || 'abdulmuniim@nasaabconstruction.com';
  const rawPassword = args[3] || 'password123';
  const fullName = args[4] || 'Eng. Abdulmuniim Al-Habsi';

  console.log(`\n🔐 Provisioning Administrator Account:`);
  console.log(`   User ID  : ${userId}`);
  console.log(`   Username : ${username}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Full Name: ${fullName}`);

  if (rawPassword.length < 8) {
    console.warn(`   ⚠️ Warning: Password length is under 8 characters.`);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  const connection = await pool.getConnection();
  try {
    await connection.query(`
      INSERT INTO users (
        id, username, email, password_hash, name, role,
        company, is_active
      ) VALUES (?, ?, ?, ?, ?, 'admin', 'NASAAB CONSTRUCTION LIMITED', 1)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        name = VALUES(name),
        role = 'admin',
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP;
    `, [userId, username, email, passwordHash, fullName]);

    console.log(`   ✅ Administrator account successfully provisioned and verified in MySQL database.\n`);
  } catch (err) {
    console.error(`   ❌ Failed to provision administrator:`, err.message);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

createAdmin();
