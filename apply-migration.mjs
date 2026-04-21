import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

const sql = readFileSync('./drizzle/0042_soft_mandroid.sql', 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('✅', stmt.substring(0, 60));
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⏭️ Already exists:', stmt.substring(0, 60));
    } else {
      console.error('❌', e.message.substring(0, 100));
    }
  }
}

await conn.end();
console.log('Migration done!');
