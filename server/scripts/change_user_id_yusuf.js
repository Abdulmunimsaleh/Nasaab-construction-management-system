import '../env.js';
import pool from '../db.js';

async function updateYusufId() {
  const conn = await pool.getConnection();
  try {
    console.log('🚀 Changing user ID from usr-yusuf-faiz to usr-yusuf-ismail in PostgreSQL...');

    await conn.query('BEGIN');

    // 1. Update users table id
    const [result] = await conn.query(
      "UPDATE users SET id = 'usr-yusuf-ismail' WHERE id = 'usr-yusuf-faiz'"
    );
    console.log(`✅ Updated users table. Rows affected:`, result.affectedRows);

    // 2. Update project_user_assignments id if it contains 'faiz'
    const [puaResult] = await conn.query(
      "UPDATE project_user_assignments SET id = REPLACE(id, 'faiz', 'ismail') WHERE id LIKE '%faiz%' OR user_id = 'usr-yusuf-ismail'"
    );
    console.log(`✅ Updated project_user_assignments records. Rows affected:`, puaResult.affectedRows);

    // 3. Check any audit logs or other tables that might store text IDs
    try {
      await conn.query(
        "UPDATE audit_logs SET user_id = 'usr-yusuf-ismail' WHERE user_id = 'usr-yusuf-faiz'"
      );
    } catch (e) {
      // audit_logs table might not exist or might not have that user_id
    }

    await conn.query('COMMIT');

    // 4. Verify user record and assignment
    const [users] = await conn.query(
      "SELECT id, user_id, name, role, status FROM users WHERE id IN ('usr-yusuf-ismail', 'usr-yusuf-faiz')"
    );
    console.log('\nVerified user record in DB:');
    console.table(users);

    const [assignments] = await conn.query(
      `SELECT pua.id, pua.user_id, pua.project_id, p.name as project_name, pua.role
       FROM project_user_assignments pua
       JOIN projects p ON pua.project_id = p.id
       WHERE pua.user_id = 'usr-yusuf-ismail'`
    );
    console.log('\nVerified project assignments:');
    console.table(assignments);

    console.log('\n🎉 Successfully migrated usr-yusuf-faiz to usr-yusuf-ismail in database!');
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('❌ Error updating user ID:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

updateYusufId();
