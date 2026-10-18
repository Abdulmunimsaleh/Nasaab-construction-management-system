/**
 * NASAAB Construction — Database Migration Runner
 * 
 * Tracks applied migrations in `schema_migrations` table and applies
 * pending versioned migrations in alphabetical/version order.
 * Safe to run repeatedly (idempotent).
 */
import '../env.js';
import pool from '../db.js';
import * as migration001 from './001_initial_schema.js';
import * as migration002 from './002_restructure_schema.js';
import * as migration003 from './003_materials_received_and_photos.js';
import * as migration004 from './004_lae_labour_rates_and_equipment_expenses.js';
import * as migration005 from './005_weekly_reports.js';
import { initPostgresSchema } from './postgres_schema.js';

const MIGRATIONS = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005
];

export async function runMigrations() {
  if (pool.isPostgres) {
    return initPostgresSchema(pool);
  }

  console.log('\n🔄 Checking database migrations...');
  const connection = await pool.getConnection();

  try {
    // Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Fetch applied migrations
    const [rows] = await connection.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(rows.map((r) => r.version));

    let appliedCount = 0;

    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) {
        console.log(`   ⏭️  Already applied: ${migration.version} (${migration.name})`);
        continue;
      }

      console.log(`   ⏳ Applying migration: ${migration.version} (${migration.name})...`);
      
      // Execute migration
      await migration.up(connection);

      // Record in schema_migrations
      await connection.query(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );

      console.log(`   ✅ Successfully applied: ${migration.version}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('   ✨ Database schema is fully up to date.\n');
    } else {
      console.log(`   🎉 Applied ${appliedCount} migration(s) successfully.\n`);
    }

    return { success: true, appliedCount };
  } catch (err) {
    console.error('   ❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

// Allow direct execution: node server/migrations/migrate.js
if (process.argv[1]?.replace(/\\/g, '/').endsWith('migrations/migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
