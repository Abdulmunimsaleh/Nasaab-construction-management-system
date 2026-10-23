/**
 * NASAAB CONSTRUCTION — Explicit Database Provisioning Script
 * 
 * Provisions:
 * 1. Confirms database is 'nasaab_construction'.
 * 2. Applies clean schema migration.
 * 3. Creates the 3 official projects:
 *    - Majestic Palms (Kizingo, Mombasa)
 *    - MMA (Tudor, Mombasa)
 *    - SeaCrest (Nyali, Mombasa)
 * 4. Creates the 13 unique user accounts with secure bcrypt hashes and activation tokens.
 * 5. Creates exact project memberships.
 * 6. Generates secure, one-time activation credentials in server/credentials/activation_tokens.json.
 * 
 * MUST BE EXPLICITLY INVOKED: node server/scripts/provision.js
 * NEVER RUNS AUTOMATICALLY ON SERVER START.
 */
import '../env.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { runMigrations } from '../migrations/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function provision() {
  console.log('=====================================================');
  console.log('🏗️  NASAAB CONSTRUCTION — SYSTEM PROVISIONING');
  console.log('=====================================================\n');

  const connection = await pool.getConnection();

  try {
    // 1. Safety check database name
    const [dbRes] = await connection.query('SELECT DATABASE() AS currentDb');
    const currentDb = dbRes[0]?.currentDb;

    console.log(`🔍 Checking target database: "${currentDb}"`);
    if (currentDb !== 'nasaab_construction') {
      throw new Error(`ABORT: Refusing to provision database "${currentDb}". Target must be "nasaab_construction".`);
    }
    console.log('✅ Target database verified: nasaab_construction\n');

    // 2. Run migrations to ensure clean restructured schema
    console.log('📦 Executing schema migrations...');
    await runMigrations();
    console.log('✅ Schema migration verified.\n');

    // Start transaction for atomic provisioning
    await connection.beginTransaction();

    // Clear any previous records from these tables to guarantee a clean state
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE project_user_assignments');
    await connection.query('TRUNCATE TABLE lae_form_labour_items');
    await connection.query('TRUNCATE TABLE lae_form_activity_items');
    await connection.query('TRUNCATE TABLE lae_form_equipment_items');
    await connection.query('TRUNCATE TABLE labour_activity_equipment_forms');
    await connection.query('TRUNCATE TABLE material_request_items');
    await connection.query('TRUNCATE TABLE material_request_forms');
    await connection.query('TRUNCATE TABLE costs');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('TRUNCATE TABLE projects');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 3. Define the 3 Projects
    const projects = [
      {
        id: 'prj-majestic-palms',
        code: 'MP-01',
        name: 'Majestic Palms',
        location: 'Kizingo, opposite Masjid Ummu Kulthum, Mombasa, Kenya',
        status: 'active'
      },
      {
        id: 'prj-mma',
        code: 'MMA-01',
        name: 'MMA',
        location: 'Tudor, Mombasa, Kenya',
        status: 'active'
      },
      {
        id: 'prj-seacrest',
        code: 'SC-01',
        name: 'SeaCrest',
        location: 'Nyali, near Masjid Taib, Mombasa, Kenya',
        status: 'active'
      }
    ];

    for (const p of projects) {
      await connection.query(
        `INSERT INTO projects (id, code, name, location, status) VALUES (?, ?, ?, ?, ?)`,
        [p.id, p.code, p.name, p.location, p.status]
      );
      console.log(`📁 Created Project: [${p.code}] ${p.name} (${p.location})`);
    }

    // 4. Define the 13 unique users
    const userDefinitions = [
      // System-wide Global Access (Admin / Director)
      { id: 'usr-abdulmunim-swaleh', name: 'Abdulmunim Swaleh', userId: 'abdulmunim.swaleh', role: 'Admin' },
      { id: 'usr-mohamed-amin', name: 'Mohamed Amin', userId: 'mohamed.amin', role: 'Director' },
      { id: 'usr-firdaus-ali', name: 'Firdaus Ali', userId: 'firdaus.ali', role: 'Director' },

      // Majestic Palms Personnel
      { id: 'usr-mohamed-amoody', name: 'Mohamed Alamoody', userId: 'mohamed.alamoody', role: 'Partner' },
      { id: 'usr-mohamed-majid', name: 'Mohamed Majid', userId: 'mohamed.majid', role: 'Storekeeper' },
      { id: 'usr-daniel-arap', name: 'Daniel Nzuki', userId: 'daniel.nzuki', role: 'Foreman' },
      { id: 'usr-salah-amir', name: 'Salah Amir', userId: 'salah.amir', role: 'Storekeeper' },
      { id: 'usr-ali-amir', name: 'Ali Amir', userId: 'ali.amir', role: 'Storekeeper' },
      { id: 'usr-talal-amir', name: 'Talal Amir', userId: 'talal.amir', role: 'Storekeeper' },
      { id: 'usr-mohamed-ainen', name: 'Mohamed Ainen', userId: 'mohamed.ainen', role: 'Storekeeper' },

      // MMA Personnel
      { id: 'usr-abdulfatah-sabir', name: 'Abdulfatah Sabir', userId: 'abdulfatah.sabir', role: 'Partner' },
      { id: 'usr-fatma-jumaan', name: 'Fatma Jumaan', userId: 'fatma.jumaan', role: 'Partner' },
      { id: 'usr-abdikadir-osman', name: 'Abdikadir Osman', userId: 'abdikadir.osman', role: 'Storekeeper' },
      { id: 'usr-mohammad-hassan', name: 'Mohammad Hassan', userId: 'mohammad.hassan', role: 'Foreman' },

      // SeaCrest Personnel
      { id: 'usr-mohamed-hussein', name: 'Mohamed Hussein', userId: 'mohamed.hussein', role: 'Partner' },
      { id: 'usr-abdi-mahad', name: 'Abdi Mahad', userId: 'abdi.mahad', role: 'Partner' },
      { id: 'usr-yusuf-faiz', name: 'Yusuf Faiz', userId: 'yusuf.faiz', role: 'Storekeeper' },
      { id: 'usr-hussein-munga', name: 'Hussein Munga', userId: 'hussein.munga', role: 'Foreman' }
    ];

    console.log('\n👥 Provisioning 13 unique accounts with secure credentials...');
    const activationRecords = [];

    for (const u of userDefinitions) {
      // Generate a secure random temporary password and one-time activation token
      const tempPassword = `Nsb#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
      const activationToken = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await connection.query(
        `INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, activation_token)
         VALUES (?, ?, ?, ?, ?, 1, 'active', ?)`,
        [u.id, u.userId, u.name, passwordHash, u.role, activationToken]
      );

      activationRecords.push({
        name: u.name,
        userId: u.userId,
        role: u.role,
        tempPassword,
        activationToken,
        mustChangePassword: true
      });

      console.log(`   👤 Created account: ${u.name} (User ID: ${u.userId}) — Role: ${u.role}`);
    }

    // 5. Create Project Memberships
    // Note: Admins & Directors have global access, but we also register them to all projects for direct querying
    // Partners, Storekeepers, Foremen are strictly assigned per specification
    const projectAssignments = [
      // Global Admins & Directors assigned to all 3 projects
      { projectId: 'prj-majestic-palms', userId: 'usr-abdulmunim-swaleh', role: 'Admin' },
      { projectId: 'prj-mma', userId: 'usr-abdulmunim-swaleh', role: 'Admin' },
      { projectId: 'prj-seacrest', userId: 'usr-abdulmunim-swaleh', role: 'Admin' },

      { projectId: 'prj-majestic-palms', userId: 'usr-mohamed-amin', role: 'Director' },
      { projectId: 'prj-mma', userId: 'usr-mohamed-amin', role: 'Director' },
      { projectId: 'prj-seacrest', userId: 'usr-mohamed-amin', role: 'Director' },

      { projectId: 'prj-majestic-palms', userId: 'usr-firdaus-ali', role: 'Director' },
      { projectId: 'prj-mma', userId: 'usr-firdaus-ali', role: 'Director' },
      { projectId: 'prj-seacrest', userId: 'usr-firdaus-ali', role: 'Director' },

      // Majestic Palms
      { projectId: 'prj-majestic-palms', userId: 'usr-mohamed-amoody', role: 'Partner' },
      { projectId: 'prj-majestic-palms', userId: 'usr-abdulfatah-sabir', role: 'Partner' },
      { projectId: 'prj-majestic-palms', userId: 'usr-mohamed-majid', role: 'Storekeeper' },
      { projectId: 'prj-majestic-palms', userId: 'usr-daniel-arap', role: 'Foreman' },
      { projectId: 'prj-majestic-palms', userId: 'usr-salah-amir', role: 'Storekeeper' },
      { projectId: 'prj-majestic-palms', userId: 'usr-ali-amir', role: 'Storekeeper' },
      { projectId: 'prj-majestic-palms', userId: 'usr-talal-amir', role: 'Storekeeper' },
      { projectId: 'prj-majestic-palms', userId: 'usr-mohamed-ainen', role: 'Storekeeper' },

      // MMA
      { projectId: 'prj-mma', userId: 'usr-mohamed-amoody', role: 'Partner' },
      { projectId: 'prj-mma', userId: 'usr-abdulfatah-sabir', role: 'Partner' },
      { projectId: 'prj-mma', userId: 'usr-fatma-jumaan', role: 'Partner' },
      { projectId: 'prj-mma', userId: 'usr-abdikadir-osman', role: 'Storekeeper' },
      { projectId: 'prj-mma', userId: 'usr-mohammad-hassan', role: 'Foreman' },

      // SeaCrest
      { projectId: 'prj-seacrest', userId: 'usr-mohamed-amoody', role: 'Partner' },
      { projectId: 'prj-seacrest', userId: 'usr-abdulfatah-sabir', role: 'Partner' }, // Abdulfatah is assigned to Majestic Palms, MMA, and SeaCrest!
      { projectId: 'prj-seacrest', userId: 'usr-mohamed-hussein', role: 'Partner' },
      { projectId: 'prj-seacrest', userId: 'usr-abdi-mahad', role: 'Partner' },
      { projectId: 'prj-seacrest', userId: 'usr-yusuf-faiz', role: 'Storekeeper' },
      { projectId: 'prj-seacrest', userId: 'usr-hussein-munga', role: 'Foreman' }
    ];

    console.log('\n🔗 Assigning project memberships...');
    for (const a of projectAssignments) {
      const assignmentId = `pua-${crypto.randomBytes(8).toString('hex')}`;
      await connection.query(
        `INSERT INTO project_user_assignments (id, project_id, user_id, role) VALUES (?, ?, ?, ?)`,
        [assignmentId, a.projectId, a.userId, a.role]
      );
    }
    console.log(`✅ Inserted ${projectAssignments.length} project-user assignment records.`);

    // Initialize company settings if not already present
    await connection.query(`
      INSERT INTO company_settings (id, company_name, nca_registration, address, phone, email, website, pdf_logo_text)
      VALUES ('comp-nasaab', 'NASAAB CONSTRUCTION LIMITED', 'NCA 1 - Building & Civil Engineering Works',
              'Mombasa, Kenya', '+254 700 000 000', 'info@nasaabconstruction.com', 'www.nasaabconstruction.com',
              'NASAAB CONSTRUCTION LIMITED')
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
    `);

    // Commit transaction
    await connection.commit();
    console.log('✅ Database transaction committed successfully.\n');

    // 6. Save Secure Activation Credentials to restricted file
    const credDir = path.resolve(__dirname, '../credentials');
    if (!fs.existsSync(credDir)) {
      fs.mkdirSync(credDir, { recursive: true });
    }
    const credFile = path.join(credDir, 'activation_tokens.json');
    fs.writeFileSync(credFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      notice: 'CONFIDENTIAL: Initial temporary passwords and activation tokens for first-time login. Passwords must be changed upon first login.',
      accounts: activationRecords
    }, null, 2), 'utf8');

    console.log('=====================================================');
    console.log('🎉 PROVISIONING COMPLETED SUCCESSFULLY!');
    console.log(`📁 Secure activation credentials saved to:`);
    console.log(`   ${credFile}`);
    console.log('   (Each user must set their permanent password upon first login)');
    console.log('=====================================================\n');

  } catch (err) {
    await connection.rollback();
    console.error('❌ Provisioning failed! Rolled back transaction:', err.message);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

provision()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
