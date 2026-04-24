import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection(url);
const sql = readFileSync('drizzle/0044_wandering_vapor.sql', 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.substring(0, 60) + '...');
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('SKIP (exists):', stmt.substring(0, 60) + '...');
    } else {
      console.error('ERR:', e.message);
    }
  }
}
await conn.end();
console.log('Migration complete');
