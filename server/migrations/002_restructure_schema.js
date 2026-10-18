/**
 * Migration 002: NASAAB Construction Restructure Schema
 * 
 * Replaces old demo/seed tables with clean, normalized schema:
 * - projects (supporting dynamic project additions)
 * - users (secure, unique per person, bcrypt hashed, password setup flag)
 * - project_user_assignments (project memberships & roles)
 * - labour_activity_equipment_forms (and child tables: labour, activity, equipment)
 * - material_request_forms (and child table: request items)
 * - costs (financial records scoped to project)
 * - company_settings
 * - audit_logs
 * 
 * Completely drops unwanted legacy tables:
 * daily_reports, attendance, workers, issues, photos, material_transactions, etc.
 */

export const version = '002_restructure_schema';
export const name = 'Restructure schema for new form types and multi-project security';

export async function up(connection) {
  // Disable foreign keys during table drops/creates
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  // List of old unwanted tables to drop
  const dropTables = [
    'attendance',
    'workers',
    'daily_reports',
    'issues',
    'photos',
    'material_transactions',
    'daily_labour_logs',
    'daily_material_logs',
    'labour_log_categories',
    'equipment_logs',
    'equipment',
    'materials',
    'notifications',
    'project_assignments'
  ];

  for (const tbl of dropTables) {
    await connection.query(`DROP TABLE IF EXISTS \`${tbl}\``);
  }

  // 1. Projects Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      status ENUM('active', 'completed', 'on_hold') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_projects_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Users Table
  // If users table already exists, drop it to ensure clean structure without legacy columns
  await connection.query(`DROP TABLE IF EXISTS users`);
  await connection.query(`
    CREATE TABLE users (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('Admin', 'Director', 'Partner', 'Storekeeper', 'Foreman') NOT NULL,
      must_change_password TINYINT(1) NOT NULL DEFAULT 1,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      email VARCHAR(150) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      activation_token VARCHAR(128) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_user_id (user_id),
      INDEX idx_users_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Project User Assignments
  await connection.query(`DROP TABLE IF EXISTS project_user_assignments`);
  await connection.query(`
    CREATE TABLE project_user_assignments (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_proj_user (project_id, user_id),
      INDEX idx_pua_project (project_id),
      INDEX idx_pua_user (user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Labour, Activity and Equipment Forms (Master Table)
  await connection.query(`DROP TABLE IF EXISTS labour_activity_equipment_forms`);
  await connection.query(`
    CREATE TABLE labour_activity_equipment_forms (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      form_number VARCHAR(64) NOT NULL UNIQUE,
      prepared_by_id VARCHAR(64) DEFAULT NULL,
      prepared_by_name VARCHAR(150) NOT NULL,
      weather VARCHAR(100) DEFAULT 'Clear / Sunny',
      estimated_site_progress INT NOT NULL DEFAULT 0,
      delays_issues_incidents TEXT DEFAULT NULL,
      site_visitors VARCHAR(255) DEFAULT NULL,
      site_photos LONGTEXT DEFAULT NULL,
      general_notes TEXT DEFAULT NULL,
      status ENUM('draft', 'submitted', 'approved') NOT NULL DEFAULT 'submitted',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lae_project (project_id),
      INDEX idx_lae_date (date),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (prepared_by_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. LAE Form - Labour Items
  await connection.query(`DROP TABLE IF EXISTS lae_form_labour_items`);
  await connection.query(`
    CREATE TABLE lae_form_labour_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL,
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fli_form (form_id),
      FOREIGN KEY (form_id) REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. LAE Form - Activity Items
  await connection.query(`DROP TABLE IF EXISTS lae_form_activity_items`);
  await connection.query(`
    CREATE TABLE lae_form_activity_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL,
      activity_description TEXT NOT NULL,
      location_or_zone VARCHAR(150) DEFAULT NULL,
      status ENUM('in_progress', 'completed', 'delayed') NOT NULL DEFAULT 'in_progress',
      progress_percentage INT NOT NULL DEFAULT 0,
      remarks TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fai_form (form_id),
      FOREIGN KEY (form_id) REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. LAE Form - Equipment Items
  await connection.query(`DROP TABLE IF EXISTS lae_form_equipment_items`);
  await connection.query(`
    CREATE TABLE lae_form_equipment_items (
      id VARCHAR(64) PRIMARY KEY,
      form_id VARCHAR(64) NOT NULL,
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
      status ENUM('operational', 'standby', 'breakdown') NOT NULL DEFAULT 'operational',
      remarks TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fei_form (form_id),
      FOREIGN KEY (form_id) REFERENCES labour_activity_equipment_forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Material Request Forms (Master Table)
  await connection.query(`DROP TABLE IF EXISTS material_request_forms`);
  await connection.query(`
    CREATE TABLE material_request_forms (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      request_number VARCHAR(64) NOT NULL UNIQUE,
      date_needed DATE NOT NULL,
      urgency ENUM('normal', 'urgent', 'critical') NOT NULL DEFAULT 'normal',
      status ENUM('pending', 'approved', 'rejected', 'fulfilled') NOT NULL DEFAULT 'pending',
      created_by VARCHAR(64) DEFAULT NULL,
      requested_by_name VARCHAR(150) NOT NULL,
      site_progress TEXT DEFAULT NULL,
      materials_needed_tomorrow TEXT DEFAULT NULL,
      site_photos LONGTEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mrf_project (project_id),
      INDEX idx_mrf_date (date_needed),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Material Request Items
  await connection.query(`DROP TABLE IF EXISTS material_request_items`);
  await connection.query(`
    CREATE TABLE material_request_items (
      id VARCHAR(64) PRIMARY KEY,
      request_id VARCHAR(64) NOT NULL,
      item_name VARCHAR(200) NOT NULL,
      supplier_vendor VARCHAR(255) DEFAULT NULL,
      quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
      unit VARCHAR(50) NOT NULL DEFAULT 'delivery',
      estimated_unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      delivery_notes TEXT DEFAULT NULL,
      receipt_photos LONGTEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mri_request (request_id),
      FOREIGN KEY (request_id) REFERENCES material_request_forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Costs Table
  await connection.query(`DROP TABLE IF EXISTS costs`);
  await connection.query(`
    CREATE TABLE costs (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      date DATE NOT NULL,
      created_by VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_costs_project (project_id),
      INDEX idx_costs_date (date),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. Company Settings Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id VARCHAR(64) PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      nca_registration VARCHAR(150) DEFAULT 'NCA 1 - Building & Civil Engineering Works',
      address VARCHAR(255) DEFAULT 'Mombasa, Kenya',
      phone VARCHAR(50) DEFAULT '+254 700 000 000',
      email VARCHAR(150) DEFAULT 'info@nasaabconstruction.com',
      website VARCHAR(150) DEFAULT 'www.nasaabconstruction.com',
      pdf_logo_text VARCHAR(150) DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Re-enable foreign keys
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}
