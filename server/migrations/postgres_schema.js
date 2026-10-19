/**
 * NASAAB Construction — PostgreSQL Schema & Seeder
 * 
 * Automatically provisions full PostgreSQL database structure,
 * indexes, foreign keys, and seeds default projects, users, and settings
 * if the database is newly initialized on Render or cloud PostgreSQL.
 */
import bcrypt from 'bcryptjs';

export async function initPostgresSchema(pool) {
  console.log('🔄 Initializing PostgreSQL database tables...');

  // 1. Projects Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      must_change_password SMALLINT NOT NULL DEFAULT 1,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      email VARCHAR(150) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      activation_token VARCHAR(128) DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Project User Assignments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_user_assignments (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uk_pua_project_user UNIQUE (project_id, user_id)
    );
  `);

  // 4. Labour, Activity and Equipment Forms
  await pool.query(`
    CREATE TABLE IF NOT EXISTS labour_activity_equipment_forms (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      form_number VARCHAR(64) NOT NULL UNIQUE,
      prepared_by_id VARCHAR(64) DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      prepared_by_name VARCHAR(150) NOT NULL,
      weather VARCHAR(100) DEFAULT 'Clear / Sunny',
      estimated_site_progress INT NOT NULL DEFAULT 0,
      delays_issues_incidents TEXT DEFAULT NULL,
      site_visitors VARCHAR(255) DEFAULT NULL,
      site_photos TEXT DEFAULT NULL,
      general_notes TEXT DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'submitted',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. LAE Form - Labour Items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lae_form_labour_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE,
      trade VARCHAR(100) NOT NULL,
      foreman_count INT NOT NULL DEFAULT 0,
      skilled_count INT NOT NULL DEFAULT 0,
      unskilled_count INT NOT NULL DEFAULT 0,
      foreman_rate DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
      skilled_rate DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
      unskilled_rate DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
      work_done_today TEXT DEFAULT NULL,
      work_plan_tomorrow TEXT DEFAULT NULL,
      total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      number_of_workers INT NOT NULL DEFAULT 1,
      hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
      overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. LAE Form - Activity Items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lae_form_activity_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE,
      activity_description TEXT NOT NULL,
      location_or_zone VARCHAR(150) DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
      progress_percentage INT NOT NULL DEFAULT 0,
      remarks TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. LAE Form - Equipment Items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lae_form_equipment_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE,
      equipment_name VARCHAR(150) NOT NULL,
      fuel_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      operator_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      repair_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      mechanic_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      transport_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      total_expense DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      machine_notes TEXT DEFAULT NULL,
      operating_status VARCHAR(50) NOT NULL DEFAULT 'Active',
      quantity INT NOT NULL DEFAULT 1,
      hours_used DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      operator_name VARCHAR(150) DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'operational',
      remarks TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Material Request Forms
  await pool.query(`
    CREATE TABLE IF NOT EXISTS material_request_forms (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      request_number VARCHAR(64) NOT NULL UNIQUE,
      date_needed DATE NOT NULL,
      urgency VARCHAR(32) NOT NULL DEFAULT 'normal',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_by VARCHAR(64) DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      requested_by_name VARCHAR(150) NOT NULL,
      site_progress TEXT DEFAULT NULL,
      materials_needed_tomorrow TEXT DEFAULT NULL,
      site_photos TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Material Request Items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS material_request_items (
      id VARCHAR(64) PRIMARY KEY,
      request_id VARCHAR(64) NOT NULL REFERENCES material_request_forms(id) ON DELETE CASCADE,
      item_name VARCHAR(200) NOT NULL,
      supplier_vendor VARCHAR(255) DEFAULT NULL,
      quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
      unit VARCHAR(50) NOT NULL DEFAULT 'delivery',
      estimated_unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      delivery_notes TEXT DEFAULT NULL,
      receipt_photos TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Costs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS costs (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      date DATE NOT NULL,
      created_by VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Company Settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id VARCHAR(64) PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      nca_registration VARCHAR(150) DEFAULT 'NCA 1 - Building & Civil Engineering Works',
      address VARCHAR(255) DEFAULT 'Mombasa, Kenya',
      phone VARCHAR(50) DEFAULT '+254 700 000 000',
      email VARCHAR(150) DEFAULT 'info@nasaabconstruction.com',
      website VARCHAR(150) DEFAULT 'www.nasaabconstruction.com',
      pdf_logo_text VARCHAR(150) DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Audit Logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) DEFAULT NULL,
      details TEXT DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 13. Weekly Reports
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      report_type VARCHAR(32) NOT NULL,
      week_number INT NOT NULL,
      year INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      title VARCHAR(255) NOT NULL,
      summary TEXT DEFAULT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'generated',
      prepared_by_id VARCHAR(64) DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      prepared_by_name VARCHAR(150) NOT NULL,
      total_workers INT NOT NULL DEFAULT 0,
      total_labour_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      total_equipment_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      total_material_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      lae_form_count INT NOT NULL DEFAULT 0,
      material_request_count INT NOT NULL DEFAULT 0,
      metadata TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ PostgreSQL tables verified.');

  // ---------------- Seed Initial Data If Empty ----------------
  const [projCheck] = await pool.query('SELECT COUNT(*) as count FROM projects');
  const projectCount = parseInt(projCheck[0]?.count || 0, 10);

  if (projectCount === 0) {
    console.log('🌱 Seeding initial NASAAB projects, users, and settings into PostgreSQL...');

    // 1. Projects
    const initialProjects = [
      { id: 'prj-majestic-palms', code: 'MP-01', name: 'Majestic Palms', location: 'Kizingo, opposite Masjid Ummu Kulthum, Mombasa, Kenya' },
      { id: 'prj-mma', code: 'MMA-01', name: 'MMA', location: 'Tudor, Mombasa, Kenya' },
      { id: 'prj-seacrest', code: 'SC-01', name: 'SeaCrest', location: 'Nyali, near Masjid Taib, Mombasa, Kenya' }
    ];

    for (const p of initialProjects) {
      await pool.query(
        'INSERT INTO projects (id, code, name, location, status) VALUES (?, ?, ?, ?, ?)',
        [p.id, p.code, p.name, p.location, 'active']
      );
    }

    // 2. Default Company Settings
    await pool.query(`
      INSERT INTO company_settings (id, company_name, nca_registration, address, phone, email, website, pdf_logo_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `, [
      'comp-nasaab',
      'NASAAB CONSTRUCTION LIMITED',
      'NCA 1 - Building & Civil Engineering Works',
      'Mombasa, Kenya',
      '+254 700 000 000',
      'info@nasaabconstruction.com',
      'www.nasaabconstruction.com',
      'NASAAB CONSTRUCTION LIMITED'
    ]);

    // 3. 13 Standard Users
    const defaultUsers = [
      { id: 'usr-abdulmunim-swaleh', name: 'Abdulmunim Swaleh', userId: 'abdulmunim.swaleh', role: 'Admin', token: 'ed8626bf755aed4a6e360bc774a0a176c2412dae5fa40e12', pass: 'Nsb#f274891a!385' },
      { id: 'usr-mohamed-amin', name: 'Mohamed Amin', userId: 'mohamed.amin', role: 'Director', token: '22ac7cbc70e68360dc0c03a94bef0eff527ecc25e5adf8f7', pass: 'Nsb#244bf8f3!633' },
      { id: 'usr-firdaus-ali', name: 'Firdaus Ali', userId: 'firdaus.ali', role: 'Director', token: '8b3295cefa705e9d8cc78977b01c83aafdc25f08d6a0f5a8', pass: 'Nsb#7cc6b89c!890' },
      { id: 'usr-mohamed-amoody', name: 'Mohamed Alamoody', userId: 'mohamed.alamoody', role: 'Partner', token: '05006079e09998474f3751a106e8e61457237dff7573e655', pass: 'Nsb#52888720!342', project: 'prj-majestic-palms' },
      { id: 'usr-mohamed-majeed', name: 'Mohamed Majeed', userId: 'mohamed.majeed', role: 'Foreman', token: '6d9da26d40ee1e467d337f766e4324fbf45bc38fdf28e232', pass: 'Nsb#2d36faeb!338', project: 'prj-majestic-palms' },
      { id: 'usr-daniel-arap', name: 'Daniel Arap', userId: 'daniel.arap', role: 'Foreman', token: 'a06a25b2f2939b4b087a32dbb48c48a7b05537651a2e4c84', pass: 'Nsb#680979ea!509', project: 'prj-majestic-palms' },
      { id: 'usr-salah-amir', name: 'Salah Amir', userId: 'salah.amir', role: 'Storekeeper', token: '5cfaeb356f93fe135546d1bf5f8664161bcf7bb57d6e6a10', pass: 'Nsb#11be245a!183', project: 'prj-majestic-palms' },
      { id: 'usr-ali-amir', name: 'Ali Amir', userId: 'ali.amir', role: 'Storekeeper', token: '1daee3e07d72658fa9a1d94e2daec9a611c01062c3e41416', pass: 'Nsb#99c679a9!547', project: 'prj-majestic-palms' },
      { id: 'usr-talal-amir', name: 'Talal Amir', userId: 'talal.amir', role: 'Storekeeper', token: 'db48c26bb45b7ee2e742e47c1b52fbf3e0a0a5528a47ba9f', pass: 'Nsb#f6c58908!604', project: 'prj-majestic-palms' },
      { id: 'usr-mohamed-ainen', name: 'Mohamed Ainen', userId: 'mohamed.ainen', role: 'Storekeeper', token: '202c4620f4ae8b5fec2bb7bb2a00c7fb6e987c95e1eb24ca', pass: 'Nsb#8667a421!481', project: 'prj-majestic-palms' },
      { id: 'usr-brian-koome', name: 'Brian Koome', userId: 'brian.koome', role: 'Storekeeper', token: '646545b73ba93108cbafefc695b1e604ec28205f45815cf1', pass: 'Nsb#b7b8098c!742', project: 'prj-majestic-palms' },
      { id: 'usr-abdulfatah-sabir', name: 'Abdulfatah Sabir', userId: 'abdulfatah.sabir', role: 'Partner', token: '38a6ec040909c00b0d3e5513aafe01824a66a74bbfffa3ee', pass: 'Nsb#beea1ea0!322', projects: ['prj-mma', 'prj-majestic-palms'] },
      { id: 'usr-abdikadir-osman', name: 'Abdikadir Osman', userId: 'abdikadir.osman', role: 'Storekeeper', token: '499971bc3f28d8442fae3839255a5fbc08cb1744ef87e74d', pass: 'Nsb#38030fc8!718', project: 'prj-mma' },
      { id: 'usr-mohammad-hassan', name: 'Mohammad Hassan', userId: 'mohammad.hassan', role: 'Foreman', token: '492b45e751d3b019183d21b7987b7a14e941164931a26d7f', pass: 'Nsb#e62846fa!168', project: 'prj-mma' },
      { id: 'usr-mohamed-hussein', name: 'Mohamed Hussein', userId: 'mohamed.hussein', role: 'Partner', token: '7b545f44da235775c742353a29082ebc22d1df7b663b6a98', pass: 'Nsb#9d67bc88!315', project: 'prj-seacrest' },
      { id: 'usr-abdi-mahad', name: 'Abdi Mahad', userId: 'abdi.mahad', role: 'Partner', token: '870420d40232c9540b79da9d682490aa563b73e5bf2a82fa', pass: 'Nsb#7da69622!166', project: 'prj-seacrest' },
      { id: 'usr-yusuf-faiz', name: 'Yusuf Faiz', userId: 'yusuf.faiz', role: 'Storekeeper', token: 'da3039d6ec67e4dd38b0e6e73685f09623545dfc04c0ec8f', pass: 'Nsb#0b65a587!594', project: 'prj-seacrest' },
      { id: 'usr-hussein-munga', name: 'Hussein Munga', userId: 'hussein.munga', role: 'Foreman', token: '5c0cf3b1e32d189bb53e7d6a50cbe5c3b1ea0cf200c9ea47', pass: 'Nsb#120c904e!442', project: 'prj-seacrest' },
      { id: 'usr-fatma-jumaan', name: 'Fatma Jumaan', userId: 'fatma.jumaan', role: 'Partner', token: '3692e74a6fd2fa7889d5d48e7abe2c8f06815f616b6727df', pass: 'Fatma@MMA2026', project: 'prj-mma' }
    ];

    for (const u of defaultUsers) {
      const hash = await bcrypt.hash(u.pass, 10);
      await pool.query(`
        INSERT INTO users (id, user_id, name, password_hash, role, must_change_password, status, activation_token)
        VALUES (?, ?, ?, ?, ?, 1, 'active', ?)
        ON CONFLICT (id) DO NOTHING
      `, [u.id, u.userId, u.name, hash, u.role, u.token]);

      const userProjects = u.projects || (u.project ? [u.project] : null);

      if (userProjects) {
        for (const projId of userProjects) {
          await pool.query(`
            INSERT INTO project_user_assignments (id, project_id, user_id, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (project_id, user_id) DO NOTHING
          `, [`pua-${u.id}-${projId}`, projId, u.id, u.role]);
        }
      } else {
        // Global roles assigned to all projects
        for (const p of initialProjects) {
          await pool.query(`
            INSERT INTO project_user_assignments (id, project_id, user_id, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (project_id, user_id) DO NOTHING
          `, [`pua-${u.id}-${p.id}`, p.id, u.id, u.role]);
        }
      }
    }

    console.log('🎉 PostgreSQL initial database seeding complete!');
  }
}
