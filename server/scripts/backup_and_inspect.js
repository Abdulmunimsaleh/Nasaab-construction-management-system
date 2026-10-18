import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectAndBackup() {
  const conn = await pool.getConnection();
  try {
    const [dbResult] = await conn.query('SELECT DATABASE() AS currentDb');
    const currentDb = dbResult[0].currentDb;
    console.log(`CURRENT_DB: ${currentDb}`);

    if (currentDb !== 'nasaab_construction') {
      throw new Error(`SAFETY ABORT: Expected database 'nasaab_construction', got '${currentDb}'`);
    }

    // Get list of tables
    const [tables] = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [currentDb]
    );

    const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
    console.log(`Found ${tableNames.length} tables in ${currentDb}:`, tableNames);

    const backupData = {
      database: currentDb,
      backupTimestamp: new Date().toISOString(),
      tables: {}
    };

    let totalRecords = 0;
    const tableSummary = [];

    for (const tbl of tableNames) {
      const [rows] = await conn.query(`SELECT * FROM \`${tbl}\``);
      const [createTbl] = await conn.query(`SHOW CREATE TABLE \`${tbl}\``);
      const createSql = createTbl[0]['Create Table'];

      backupData.tables[tbl] = {
        createSql,
        rowCount: rows.length,
        rows
      };
      totalRecords += rows.length;
      tableSummary.push({ table: tbl, count: rows.length });
    }

    // Save JSON backup
    const backupDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup_nasaab_construction_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');

    // Also write a raw SQL dump
    let sqlDump = `-- Backup of ${currentDb}\n-- Generated: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;
    for (const tbl of tableNames) {
      sqlDump += `DROP TABLE IF EXISTS \`${tbl}\`;\n`;
      sqlDump += `${backupData.tables[tbl].createSql};\n\n`;
      if (backupData.tables[tbl].rows.length > 0) {
        for (const row of backupData.tables[tbl].rows) {
          const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
          const values = Object.values(row).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          sqlDump += `INSERT INTO \`${tbl}\` (${keys}) VALUES (${values});\n`;
        }
        sqlDump += `\n`;
      }
    }
    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const sqlBackupFile = path.join(backupDir, `backup_nasaab_construction_${Date.now()}.sql`);
    fs.writeFileSync(sqlBackupFile, sqlDump, 'utf8');

    console.log(`\n=== BACKUP COMPLETED SUCCESSFULLY ===`);
    console.log(`Backup JSON: ${backupFile}`);
    console.log(`Backup SQL : ${sqlBackupFile}`);
    console.log(`Total Tables: ${tableNames.length}`);
    console.log(`Total Records: ${totalRecords}`);
    console.log(`\n=== TABLE RECORD COUNTS ===`);
    console.table(tableSummary);

  } catch (err) {
    console.error('Backup error:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

inspectAndBackup();
