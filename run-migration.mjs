import fs from 'fs';
import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const sql = fs.readFileSync('drizzle/0036_exotic_omega_red.sql', 'utf8');
  try {
    await conn.execute(sql);
    console.log('Migration applied successfully!');
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists, skipping...');
    } else {
      throw e;
    }
  } finally {
    await conn.end();
  }
  console.log('Migration complete!');
}
run().catch(e => { console.error(e); process.exit(1); });
