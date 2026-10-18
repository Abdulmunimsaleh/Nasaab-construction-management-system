/**
 * Migration 001: Initial Normalized Relational Schema for NASAAB Construction
 * 
 * Creates all required tables with foreign keys, indexes, timestamps,
 * and constraint validations. Uses CREATE TABLE IF NOT EXISTS to guarantee
 * idempotency without dropping or altering existing user data.
 */

export const version = '001_initial_schema';
export const name = 'Create initial normalized tables';

export async function up(connection) {
  // 1. Users Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      email VARCHAR(128) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(128) NOT NULL,
      role ENUM('admin', 'director', 'partner', 'foreman', 'storekeeper') NOT NULL,
      company VARCHAR(128) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      avatar VARCHAR(512) DEFAULT NULL,
      phone VARCHAR(64) DEFAULT NULL,
      location VARCHAR(128) DEFAULT NULL,
      license_no VARCHAR(64) DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_username (username),
      INDEX idx_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Projects Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      client VARCHAR(255) NOT NULL,
      client_contact VARCHAR(255) DEFAULT NULL,
      location VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      project_manager VARCHAR(128) DEFAULT NULL,
      site_engineer VARCHAR(128) DEFAULT NULL,
      start_date DATE DEFAULT NULL,
      expected_completion DATE DEFAULT NULL,
      contract_value DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      budget DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      spent DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      status ENUM('Active', 'On Hold', 'Completed', 'Archived') NOT NULL DEFAULT 'Active',
      progress INT NOT NULL DEFAULT 0,
      image VARCHAR(512) DEFAULT NULL,
      category VARCHAR(128) NOT NULL DEFAULT 'General Construction',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_projects_status (status),
      INDEX idx_projects_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Project Assignments Table (Enforces role-to-project authorization)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      project_id VARCHAR(64) NOT NULL,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_by VARCHAR(64) DEFAULT NULL,
      UNIQUE KEY uq_user_project (user_id, project_id),
      CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_assignment_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_pa_user (user_id),
      INDEX idx_pa_project (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Workers Table (Labour pool per project)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      full_name VARCHAR(128) NOT NULL,
      role VARCHAR(128) NOT NULL,
      trade VARCHAR(128) NOT NULL,
      phone VARCHAR(64) DEFAULT NULL,
      company VARCHAR(128) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
      status VARCHAR(32) NOT NULL DEFAULT 'Active',
      emergency_contact VARCHAR(255) DEFAULT NULL,
      skills JSON DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_worker_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_workers_project (project_id),
      INDEX idx_workers_trade (trade)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Worker Attendance Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(64) PRIMARY KEY,
      worker_id VARCHAR(64) NOT NULL,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      status ENUM('Present', 'Absent', 'Half Day') NOT NULL DEFAULT 'Present',
      check_in VARCHAR(16) DEFAULT '07:30',
      check_out VARCHAR(16) DEFAULT '17:00',
      normal_hours DECIMAL(4, 1) NOT NULL DEFAULT 8.0,
      overtime_hours DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_worker_date (worker_id, date),
      CONSTRAINT fk_attendance_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
      CONSTRAINT fk_attendance_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_att_project_date (project_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Equipment / Machinery Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      code VARCHAR(64) NOT NULL,
      type VARCHAR(128) NOT NULL DEFAULT 'Heavy Plant',
      owner VARCHAR(128) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED Fleet',
      operator VARCHAR(128) DEFAULT NULL,
      daily_rate DECIMAL(12, 2) NOT NULL DEFAULT 25000.00,
      hourly_rate DECIMAL(12, 2) NOT NULL DEFAULT 3500.00,
      status ENUM('Available', 'In Use', 'Maintenance', 'Standby') NOT NULL DEFAULT 'Available',
      location VARCHAR(255) NOT NULL DEFAULT 'Site Yard',
      total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      fuel_level VARCHAR(32) NOT NULL DEFAULT '100%',
      next_service DATE DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_equipment_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_equipment_project (project_id),
      INDEX idx_equipment_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Equipment Operating Logs Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS equipment_logs (
      id VARCHAR(64) PRIMARY KEY,
      equipment_id VARCHAR(64) NOT NULL,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      operator VARCHAR(128) DEFAULT NULL,
      start_time VARCHAR(16) DEFAULT '08:00',
      end_time VARCHAR(16) DEFAULT '17:00',
      operating_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
      idle_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
      fuel_used VARCHAR(64) DEFAULT '0 Litres',
      hourly_rate DECIMAL(12, 2) NOT NULL DEFAULT 3500.00,
      calculated_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      maintenance VARCHAR(255) DEFAULT 'Routine check OK',
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_eqlog_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
      CONSTRAINT fk_eqlog_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_eqlog_project_date (project_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Daily Labour Logs Table (Dedicated shift log with progress and costs)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daily_labour_logs (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      location VARCHAR(255) DEFAULT NULL,
      overall_progress INT NOT NULL DEFAULT 50,
      total_workers_on_site INT NOT NULL DEFAULT 0,
      total_labour_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      plant_and_equipment JSON DEFAULT NULL,
      total_equipment_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      equipment_operating_hours DECIMAL(6, 2) NOT NULL DEFAULT 8.00,
      photos JSON DEFAULT NULL,
      photos_count INT NOT NULL DEFAULT 0,
      submitted_by VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Approved',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_labourlog_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_labourlog_project_date (project_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Labour Log Categories Table (Normalized trade breakdown)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS labour_log_categories (
      id VARCHAR(64) PRIMARY KEY,
      log_id VARCHAR(64) NOT NULL,
      trade_name VARCHAR(128) NOT NULL,
      foreman_count INT NOT NULL DEFAULT 0,
      skilled_count INT NOT NULL DEFAULT 0,
      unskilled_count INT NOT NULL DEFAULT 0,
      foreman_rate DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
      skilled_rate DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
      helper_rate DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
      headcount INT NOT NULL DEFAULT 0,
      cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      work_done_today TEXT DEFAULT NULL,
      work_completed_yesterday TEXT DEFAULT NULL,
      work_plan_tomorrow TEXT DEFAULT NULL,
      planned_work TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_labourcat_log FOREIGN KEY (log_id) REFERENCES daily_labour_logs(id) ON DELETE CASCADE,
      INDEX idx_labourcat_log (log_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Materials Catalog Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      category VARCHAR(128) NOT NULL DEFAULT 'General Materials',
      unit VARCHAR(64) NOT NULL DEFAULT 'Units',
      supplier VARCHAR(128) NOT NULL DEFAULT 'Approved Site Supplier',
      unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 1000.00,
      current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      minimum_stock DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
      last_restocked DATE DEFAULT NULL,
      location_zone VARCHAR(128) NOT NULL DEFAULT 'Site Store',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_materials_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_materials_project (project_id),
      INDEX idx_materials_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. Material Transactions Table (Stock movements: Received, Used, Wasted, etc.)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS material_transactions (
      id VARCHAR(64) PRIMARY KEY,
      material_id VARCHAR(64) NOT NULL,
      project_id VARCHAR(64) NOT NULL,
      material_name VARCHAR(128) NOT NULL,
      type ENUM('Received', 'Used', 'Wasted', 'Returned', 'Adjusted') NOT NULL,
      quantity DECIMAL(12, 2) NOT NULL,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      performed_by VARCHAR(128) NOT NULL,
      reference VARCHAR(64) DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mtxn_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      CONSTRAINT fk_mtxn_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_mtxn_project_date (project_id, date),
      INDEX idx_mtxn_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. Daily Material Logs Table (Site delivery and requisition logs)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daily_material_logs (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      site_location VARCHAR(255) DEFAULT NULL,
      site_progress VARCHAR(255) DEFAULT NULL,
      received_materials JSON DEFAULT NULL,
      materials_received_today TEXT DEFAULT NULL,
      materials_needed_tomorrow TEXT DEFAULT NULL,
      delivery_note_number VARCHAR(64) DEFAULT NULL,
      supplier VARCHAR(128) DEFAULT 'Site Delivery',
      photos JSON DEFAULT NULL,
      photos_count INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'Delivered',
      notes TEXT DEFAULT NULL,
      logged_by VARCHAR(128) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_matlog_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_matlog_project_date (project_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. Daily Reports Table (Unified daily master reports)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      project_name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      weather VARCHAR(128) NOT NULL DEFAULT 'Clear / Sunny',
      temperature VARCHAR(32) NOT NULL DEFAULT '25°C',
      site_conditions VARCHAR(255) NOT NULL DEFAULT 'Dry, accessible ground.',
      overall_progress INT NOT NULL DEFAULT 50,
      workers_present INT NOT NULL DEFAULT 24,
      workers_absent INT NOT NULL DEFAULT 1,
      labour_categories JSON DEFAULT NULL,
      total_labour_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      plant_and_equipment JSON DEFAULT NULL,
      total_equipment_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      equipment_operating_hours DECIMAL(6, 2) NOT NULL DEFAULT 8.00,
      status VARCHAR(32) NOT NULL DEFAULT 'Submitted',
      submitted_by VARCHAR(128) NOT NULL,
      supervisor VARCHAR(128) DEFAULT NULL,
      site_engineer VARCHAR(128) DEFAULT NULL,
      work_done_today TEXT DEFAULT NULL,
      work_completed_yesterday TEXT DEFAULT NULL,
      work_plan_tomorrow TEXT DEFAULT NULL,
      planned_work TEXT DEFAULT NULL,
      actual_work TEXT DEFAULT NULL,
      delays_and_safety_incidents TEXT DEFAULT NULL,
      delays_for_yesterday TEXT DEFAULT NULL,
      safety_incidents TEXT DEFAULT NULL,
      visitor_information TEXT DEFAULT NULL,
      general_notes TEXT DEFAULT NULL,
      materials_received_today TEXT DEFAULT NULL,
      materials_needed_tomorrow TEXT DEFAULT NULL,
      materials_summary JSON DEFAULT NULL,
      equipment_summary JSON DEFAULT NULL,
      photos JSON DEFAULT NULL,
      photos_count INT NOT NULL DEFAULT 0,
      location VARCHAR(255) DEFAULT NULL,
      day VARCHAR(32) DEFAULT NULL,
      rejection_reason TEXT DEFAULT NULL,
      submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_report_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_reports_project_date (project_id, date),
      INDEX idx_reports_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 14. Issues Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS issues (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      location VARCHAR(255) NOT NULL DEFAULT 'Main Site',
      category VARCHAR(64) NOT NULL DEFAULT 'Quality',
      priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
      status ENUM('Open', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
      reported_by VARCHAR(128) NOT NULL,
      assigned_to VARCHAR(128) DEFAULT 'Site Engineer',
      created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATE DEFAULT NULL,
      resolved_date TIMESTAMP NULL DEFAULT NULL,
      photos JSON DEFAULT NULL,
      timeline JSON DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_issues_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_issues_project (project_id),
      INDEX idx_issues_priority (priority),
      INDEX idx_issues_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 15. Photos Gallery Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      project_name VARCHAR(255) DEFAULT NULL,
      url LONGTEXT NOT NULL,
      caption TEXT DEFAULT NULL,
      date DATE DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      category VARCHAR(64) NOT NULL DEFAULT 'Progress',
      uploaded_by VARCHAR(128) NOT NULL,
      tags JSON DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_photos_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_photos_project (project_id),
      INDEX idx_photos_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 16. Costs Table (Restricted financial expenses)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS costs (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      date DATE NOT NULL,
      category VARCHAR(64) NOT NULL DEFAULT 'Materials',
      description TEXT NOT NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      supplier VARCHAR(128) DEFAULT 'Site Vendor',
      reference_number VARCHAR(64) DEFAULT NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'Paid',
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_costs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      INDEX idx_costs_project (project_id),
      INDEX idx_costs_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 17. Notifications Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
      link VARCHAR(255) DEFAULT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notif_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 18. Company Settings Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INT PRIMARY KEY DEFAULT 1,
      company_name VARCHAR(255) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      nca_registration VARCHAR(255) NOT NULL DEFAULT 'NCA 1 - Building & Civil Engineering Works',
      address VARCHAR(255) NOT NULL DEFAULT 'Nairobi, Kenya',
      phone VARCHAR(64) NOT NULL DEFAULT '+254 700 000 000',
      email VARCHAR(128) NOT NULL DEFAULT 'info@nasaabconstruction.com',
      website VARCHAR(128) NOT NULL DEFAULT 'www.nasaabconstruction.com',
      pdf_logo_text VARCHAR(255) NOT NULL DEFAULT 'NASAAB CONSTRUCTION LIMITED',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 19. Audit Logs Table (Tracks security and operations actions)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT NULL,
      user_name VARCHAR(128) DEFAULT NULL,
      user_role VARCHAR(64) DEFAULT NULL,
      action VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) DEFAULT NULL,
      project_id VARCHAR(64) DEFAULT NULL,
      details JSON DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_audit_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      INDEX idx_audit_user (user_id),
      INDEX idx_audit_project (project_id),
      INDEX idx_audit_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function down(connection) {
  // Only provided for emergency rollbacks; migrations are non-destructive
  console.warn('Down migration called for 001_initial_schema — tables preserved.');
}
