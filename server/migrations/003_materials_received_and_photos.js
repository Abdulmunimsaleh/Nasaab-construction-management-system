/**
 * Migration 003: Add site progress, materials needed tomorrow, site photos,
 * supplier/vendor, and receipt photos to material requests and items.
 */

export const version = '003_materials_received_and_photos';
export const name = 'Add site_progress, materials_needed_tomorrow, site_photos to material_request_forms and supplier_vendor, receipt_photos to material_request_items';

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

  // Add columns to material_request_forms
  await addColumnIfNotExists('material_request_forms', 'site_progress', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('material_request_forms', 'materials_needed_tomorrow', 'TEXT DEFAULT NULL');
  await addColumnIfNotExists('material_request_forms', 'site_photos', 'LONGTEXT DEFAULT NULL');

  // Add columns to material_request_items
  await addColumnIfNotExists('material_request_items', 'supplier_vendor', 'VARCHAR(255) DEFAULT NULL');
  await addColumnIfNotExists('material_request_items', 'receipt_photos', 'LONGTEXT DEFAULT NULL');
  await addColumnIfNotExists('material_request_items', 'delivery_notes', 'TEXT DEFAULT NULL');
}

export async function down(connection) {
  // Safe rollback
}
