/**
 * Migration 004: Add labour rates (1500, 1000, 500), workforce breakdown,
 * equipment operating expenses, delays/safety incidents, site visitors,
 * and site photos to Labour, Activity and Equipment forms.
 */

export const version = '004_lae_labour_rates_and_equipment_expenses';
export const name = 'Add labour rates and headcount, equipment expense breakdown, site progress, incidents, and photos to LAE forms';

export async function up(connection) {
  // Helper to safely add column if it doesn't already exist
  const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `, [tableName, columnName]);

    if (cols.length === 0) {
      await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  };

  // 1. Columns for labour_activity_equipment_forms (master table)
  await addColumnIfNotExists('labour_activity_equipment_forms', 'estimated_site_progress', 'INT NOT NULL DEFAULT 0');
  await addColumnIfNotExists('labour_activity_equipment_forms', 'delays_issues_incidents', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('labour_activity_equipment_forms', 'site_visitors', 'VARCHAR(255) DEFAULT NULL');
  await addColumnIfNotExists('labour_activity_equipment_forms', 'site_photos', 'LONGTEXT DEFAULT NULL');

  // 2. Columns for lae_form_labour_items (headcount, rates, work done, work plan)
  await addColumnIfNotExists('lae_form_labour_items', 'foreman_count', 'INT NOT NULL DEFAULT 0');
  await addColumnIfNotExists('lae_form_labour_items', 'skilled_count', 'INT NOT NULL DEFAULT 0');
  await addColumnIfNotExists('lae_form_labour_items', 'unskilled_count', 'INT NOT NULL DEFAULT 0');
  await addColumnIfNotExists('lae_form_labour_items', 'foreman_rate', 'DECIMAL(10, 2) NOT NULL DEFAULT 1500.00');
  await addColumnIfNotExists('lae_form_labour_items', 'skilled_rate', 'DECIMAL(10, 2) NOT NULL DEFAULT 1000.00');
  await addColumnIfNotExists('lae_form_labour_items', 'unskilled_rate', 'DECIMAL(10, 2) NOT NULL DEFAULT 500.00');
  await addColumnIfNotExists('lae_form_labour_items', 'work_done_today', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('lae_form_labour_items', 'work_plan_tomorrow', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('lae_form_labour_items', 'total_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');

  // 3. Columns for lae_form_equipment_items (expense breakdown, machine notes, status)
  await addColumnIfNotExists('lae_form_equipment_items', 'fuel_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'operator_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'repair_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'mechanic_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'transport_cost', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'total_expense', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00');
  await addColumnIfNotExists('lae_form_equipment_items', 'machine_notes', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('lae_form_equipment_items', 'operating_status', "VARCHAR(50) NOT NULL DEFAULT 'Active'");
}

export async function down(connection) {
  // Safe rollback
}
