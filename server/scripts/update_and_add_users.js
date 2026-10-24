import '../env.js';
import pool from '../db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const conn = await pool.getConnection();
  try {
    console.log('🚀 Starting User Management Update for PostgreSQL...');

    // =========================================================================
    // 1. UPDATE: Yusuf Faiz -> Yusuf Ismail (Storekeeper at SeaCrest)
    // =========================================================================
    console.log('\n--- 1. Updating Yusuf Faiz to Yusuf Ismail ---');
    const [existingYusuf] = await conn.query(
      'SELECT * FROM users WHERE user_id = ? OR id = ? OR name LIKE ?',
      ['yusuf.faiz', 'usr-yusuf-faiz', '%Yusuf%Faiz%']
    );

    if (existingYusuf.length > 0) {
      const current = existingYusuf[0];
      await conn.query(
        'UPDATE users SET name = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Yusuf Ismail', 'yusuf.ismail', current.id]
      );
      console.log(`✅ Updated user (${current.id}): Name -> "Yusuf Ismail", User ID -> "yusuf.ismail"`);
    } else {
      console.log('ℹ️ Yusuf Faiz not found under old ID; checking if yusuf.ismail already exists...');
      const [yusufCheck] = await conn.query('SELECT * FROM users WHERE user_id = ?', ['yusuf.ismail']);
      if (yusufCheck.length > 0) {
        console.log('✅ User already exists as Yusuf Ismail (yusuf.ismail).');
      }
    }

    // =========================================================================
    // 2. NEW USERS DEFINITION
    // =========================================================================
    const newUsers = [
      {
        id: 'usr-francis-oyieko',
        userId: 'francis.oyieko',
        name: 'Eng.Francis Oyieko',
        role: 'Storekeeper',
        projectId: 'prj-seacrest',
        projectName: 'SeaCrest'
      },
      {
        id: 'usr-moses-muchua',
        userId: 'moses.muchua',
        name: 'Moses Muchua',
        role: 'Foreman',
        projectId: 'prj-mma',
        projectName: 'MMA'
      },
      {
        id: 'usr-alvis-kahingu',
        userId: 'alvis.kahingu',
        name: 'Alvis Kahingu',
        role: 'Storekeeper',
        projectId: 'prj-mma',
        projectName: 'MMA'
      }
    ];

    // Read current activation_tokens.json to preserve or update
    const tokensFilePath = path.join(__dirname, '..', 'credentials', 'activation_tokens.json');
    let tokensData = { generatedAt: new Date().toISOString(), accounts: [] };
    if (fs.existsSync(tokensFilePath)) {
      tokensData = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8'));
    }

    // Update Yusuf in tokens file if present
    const yusufTokenIndex = tokensData.accounts.findIndex(
      (a) => a.userId === 'yusuf.faiz' || a.name === 'Yusuf Faiz' || a.userId === 'yusuf.ismail'
    );
    if (yusufTokenIndex !== -1) {
      tokensData.accounts[yusufTokenIndex].name = 'Yusuf Ismail';
      tokensData.accounts[yusufTokenIndex].userId = 'yusuf.ismail';
    }

    const createdCredentials = [];

    for (const u of newUsers) {
      console.log(`\n--- Provisioning ${u.name} (${u.role} at ${u.projectName}) ---`);

      // Check if user already exists
      const [existingUser] = await conn.query(
        'SELECT * FROM users WHERE user_id = ? OR id = ?',
        [u.userId, u.id]
      );

      let tempPassword;
      let activationToken;
      let passwordHash;

      // Check if credential exists in activation_tokens.json
      const existingInTokens = tokensData.accounts.find((a) => a.userId === u.userId);

      if (existingInTokens && existingInTokens.tempPassword) {
        tempPassword = existingInTokens.tempPassword;
        activationToken = existingInTokens.activationToken || crypto.randomBytes(24).toString('hex');
      } else {
        tempPassword = `Nsb#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
        activationToken = crypto.randomBytes(24).toString('hex');
      }

      passwordHash = await bcrypt.hash(tempPassword, 10);

      if (existingUser.length === 0) {
        await conn.query(
          `INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, activation_token)
           VALUES (?, ?, ?, ?, ?, 1, 'active', ?)`,
          [u.id, u.userId, u.name, passwordHash, u.role, activationToken]
        );
        console.log(`✅ Inserted user: ${u.name} (id: ${u.id}, user_id: ${u.userId})`);
      } else {
        console.log(`ℹ️ User already in DB. Updating name and role...`);
        await conn.query(
          `UPDATE users SET name = ?, role = ?, status = 'active' WHERE id = ? OR user_id = ?`,
          [u.name, u.role, u.id, u.userId]
        );
      }

      // Check and insert project assignment
      const assignmentId = `pua-${u.id}-${u.projectId}`;
      const [existingAssignment] = await conn.query(
        'SELECT * FROM project_user_assignments WHERE project_id = ? AND user_id = ?',
        [u.projectId, u.id]
      );

      if (existingAssignment.length === 0) {
        await conn.query(
          `INSERT INTO project_user_assignments (id, project_id, user_id, role)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [assignmentId, u.projectId, u.id, u.role]
        );
        console.log(`✅ Assigned ${u.name} to project ${u.projectName} (${u.projectId}) as ${u.role}`);
      } else {
        console.log(`ℹ️ Assignment already exists for ${u.name} in project ${u.projectName}. Updating role...`);
        await conn.query(
          'UPDATE project_user_assignments SET role = ? WHERE project_id = ? AND user_id = ?',
          [u.role, u.projectId, u.id]
        );
      }

      // Save credential info
      const credRecord = {
        name: u.name,
        userId: u.userId,
        role: u.role,
        project: u.projectName,
        tempPassword,
        activationToken,
        mustChangePassword: true
      };
      createdCredentials.push(credRecord);

      // Add to tokensData if not already there
      const idx = tokensData.accounts.findIndex((a) => a.userId === u.userId);
      if (idx !== -1) {
        tokensData.accounts[idx] = {
          name: u.name,
          userId: u.userId,
          role: u.role,
          tempPassword,
          activationToken,
          mustChangePassword: true
        };
      } else {
        tokensData.accounts.push({
          name: u.name,
          userId: u.userId,
          role: u.role,
          tempPassword,
          activationToken,
          mustChangePassword: true
        });
      }
    }

    // Save activation_tokens.json
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokensData, null, 2), 'utf8');
    console.log('\n📄 Updated server/credentials/activation_tokens.json successfully.');

    // Verify all users and assignments from DB
    console.log('\n================ VERIFYING DATABASE STATE ================');
    const [users] = await conn.query(
      `SELECT u.id, u.user_id, u.name, u.role, u.status, pua.project_id, p.name as project_name
       FROM users u
       LEFT JOIN project_user_assignments pua ON u.id = pua.user_id
       LEFT JOIN projects p ON pua.project_id = p.id
       WHERE u.user_id IN ('yusuf.ismail', 'francis.oyieko', 'moses.muchua', 'alvis.kahingu')
       ORDER BY u.name ASC`
    );
    console.table(users);

    console.log('\n🎉 All requested user operations completed successfully!');
  } catch (err) {
    console.error('❌ Error executing user updates:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

main();
