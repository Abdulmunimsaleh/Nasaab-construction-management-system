import pool from '../server/db.js';

async function check() {
  const [rows] = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('TABLES IN DB:', rows.map(r => r.table_name));
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
