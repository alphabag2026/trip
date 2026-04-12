import fs from 'fs';
import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const files = ['drizzle/0036_exotic_omega_red.sql', 'drizzle/0037_wild_master_mold.sql'];
  for (const file of files) {
    if (!fs.existsSync(file)) { console.log(`Skipping ${file} (not found)`); continue; }
    const sql = fs.readFileSync(file, 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        console.log(`Applied: ${stmt.substring(0, 60)}...`);
      } catch (e) {
        if (e.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`Table already exists, skipping: ${stmt.substring(0, 60)}...`);
        } else {
          console.error(`Error: ${e.message}`);
        }
      }
    }
  }
  await conn.end();
  console.log('Migration complete!');
}
run().catch(e => { console.error(e); process.exit(1); });
