/**
 * Migration 005: Weekly Reports Table
 * 
 * Creates the `weekly_reports` table for archiving, tracking, and retrieving
 * weekly construction dossier records across all project sites:
 * - 1. Full Weekly Report (Combines LAE + Materials) — Admin, Director, Partner
 * - 2. Labour, Activity and Equipment Weekly Report — Admin, Director, Partner, Foreman
 * - 3. Material Weekly Report — Admin, Director, Partner, Foreman
 */

export const version = '005_weekly_reports';
export const name = 'Create weekly_reports table for site weekly dossiers';

export async function up(connection) {
  // Create weekly_reports table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      report_type ENUM('full', 'lae', 'materials') NOT NULL,
      week_number INT NOT NULL,
      year INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      title VARCHAR(255) NOT NULL,
      summary TEXT DEFAULT NULL,
      status ENUM('draft', 'generated', 'submitted', 'approved') NOT NULL DEFAULT 'generated',
      prepared_by_id VARCHAR(64) DEFAULT NULL,
      prepared_by_name VARCHAR(150) NOT NULL,
      total_workers INT NOT NULL DEFAULT 0,
      total_labour_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      total_equipment_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      total_material_cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      lae_form_count INT NOT NULL DEFAULT 0,
      material_request_count INT NOT NULL DEFAULT 0,
      metadata LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wr_project (project_id),
      INDEX idx_wr_dates (start_date, end_date),
      INDEX idx_wr_type (report_type),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (prepared_by_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function down(connection) {
  await connection.query(`DROP TABLE IF EXISTS weekly_reports`);
}
