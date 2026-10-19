import '../env.js';
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function main() {
  const conn = await pool.getConnection();
  try {
    const userId = 'usr-fatma-jumaan';
    const loginUserId = 'fatma.jumaan';
    const name = 'Fatma Jumaan';
    const role = 'Partner';
    const rawPassword = 'Fatma@MMA2026';
    const activationToken = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const projectId = 'prj-mma';
    const assignmentId = `pua-${userId}-${projectId}`;

    console.log(`Inserting/Updating user ${name} (${loginUserId})...`);

    // Check if user already exists
    const [existing] = await conn.query('SELECT * FROM users WHERE id = ? OR user_id = ?', [userId, loginUserId]);
    
    if (existing.length > 0) {
      console.log('User already exists, updating...');
      await conn.query(`
        UPDATE users 
        SET name = ?, password_hash = ?, role = ?, must_change_password = 0, status = 'active', activation_token = ?
        WHERE id = ? OR user_id = ?
      `, [name, passwordHash, role, activationToken, userId, loginUserId]);
    } else {
      await conn.query(`
        INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, activation_token)
        VALUES (?, ?, ?, ?, ?, 0, 'active', ?)
      `, [userId, loginUserId, name, passwordHash, role, activationToken]);
      console.log('User inserted successfully.');
    }

    // Insert project assignment for MMA
    const [existingAssignment] = await conn.query(
      'SELECT * FROM project_user_assignments WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (existingAssignment.length === 0) {
      await conn.query(`
        INSERT INTO project_user_assignments (id, project_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `, [assignmentId, projectId, userId, role]);
      console.log(`Assigned ${name} to MMA site (${projectId}) as ${role}.`);
    } else {
      console.log(`User is already assigned to MMA site.`);
    }

    // Verify insertion
    const [userRecord] = await conn.query(
      'SELECT id, user_id, name, role, status, must_change_password, activation_token FROM users WHERE user_id = ?',
      [loginUserId]
    );
    console.log('Verified user record:', userRecord[0]);

    const [assignmentRecord] = await conn.query(
      `SELECT pua.id, pua.role, p.id as project_id, p.name as project_name, p.code as project_code 
       FROM project_user_assignments pua
       JOIN projects p ON pua.project_id = p.id
       WHERE pua.user_id = ?`,
      [userId]
    );
    console.log('Verified project assignments:', assignmentRecord);

    console.log('\n================ CREDENTIALS SUMMARY ================');
    console.log(`Full Name:         ${name}`);
    console.log(`User ID (Login):   ${loginUserId}`);
    console.log(`Password:          ${rawPassword}`);
    console.log(`Role:              ${role}`);
    console.log(`Assigned Site:     MMA (Project Code: MMA-01)`);
    console.log(`Activation Token:  ${activationToken}`);
    console.log('=====================================================\n');

  } catch (err) {
    console.error('Error inserting user:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

main();
