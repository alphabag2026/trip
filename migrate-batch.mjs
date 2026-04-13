import mysql from 'mysql2/promise';
import fs from 'fs';
import { execSync } from 'child_process';

const dbUrl = new URL(process.env.DATABASE_URL);
const MANUS = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000,
};

const SSH_KEY = '/home/ubuntu/upload/LightsailDefaultKey-ap-southeast-1(8).pem';
const PROD_HOST = '18.136.229.243';
const PROD_DB = 'meetup-travel_db';
const PROD_USER = 'debian-sys-maint';
const PROD_PASS = 'AddGS6E0CAQhr0BJ';

async function getJsonColumns(conn, db) {
  const [cols] = await conn.execute(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = ? AND data_type = 'json'`,
    [db]
  );
  const map = {};
  for (const c of cols) {
    if (!map[c.table_name]) map[c.table_name] = new Set();
    map[c.table_name].add(c.column_name);
  }
  return map;
}

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0')
    .replace(/\x1a/g, '\\Z');
}

function escapeValue(val, isJson) {
  if (val === null || val === undefined) return 'NULL';
  if (isJson) {
    if (typeof val === 'object') return `'${escapeString(JSON.stringify(val))}'`;
    return `'${escapeString(String(val))}'`;
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'bigint') return String(val);
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${escapeString(JSON.stringify(val))}'`;
  return `'${escapeString(String(val))}'`;
}

async function main() {
  console.log('=== DB Migration: Manus -> Production (JSON-safe) ===');
  const conn = await mysql.createConnection(MANUS);
  console.log('Connected to Manus DB');

  const jsonColMap = await getJsonColumns(conn, MANUS.database);
  console.log(`JSON columns in ${Object.keys(jsonColMap).length} tables`);

  const [tables] = await conn.execute(
    `SELECT table_name, table_rows FROM information_schema.tables 
     WHERE table_schema = ? AND table_rows > 0 AND table_name != '__drizzle_migrations'
     ORDER BY table_rows ASC`,
    [MANUS.database]
  );
  console.log(`${tables.length} tables with data`);

  const sqlFile = '/tmp/migration-batch.sql';
  const ws = fs.createWriteStream(sqlFile);
  ws.write('SET FOREIGN_KEY_CHECKS=0;\nSET NAMES utf8mb4;\n\n');

  let totalRows = 0;
  for (const { table_name: table, table_rows: estRows } of tables) {
    process.stdout.write(`  ${table} (~${estRows})...`);
    try {
      const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
      if (!rows.length) { console.log(' skip'); continue; }
      const cols = Object.keys(rows[0]);
      const colStr = cols.map(c => `\`${c}\``).join(',');
      const tableJsonCols = jsonColMap[table] || new Set();
      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const vr = batch.map(row => `(${cols.map(c => escapeValue(row[c], tableJsonCols.has(c))).join(',')})`);
        ws.write(`REPLACE INTO \`${table}\` (${colStr}) VALUES\n${vr.join(',\n')};\n`);
      }
      ws.write('\n');
      totalRows += rows.length;
      console.log(` ${rows.length} rows`);
    } catch (e) { console.log(` ERR: ${e.message.slice(0, 60)}`); }
  }

  ws.write('\nSET FOREIGN_KEY_CHECKS=1;\n');
  ws.end();
  await conn.end();
  await new Promise(r => ws.on('finish', r));

  const sz = fs.statSync(sqlFile).size;
  console.log(`\nSQL: ${(sz/1024).toFixed(1)} KB, ${totalRows} rows`);

  console.log('\nSCP transfer...');
  execSync(`scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no ${sqlFile} ubuntu@${PROD_HOST}:/tmp/migration-batch.sql`, { stdio: 'inherit' });

  console.log('\nImporting...');
  try {
    const out = execSync(
      `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no ubuntu@${PROD_HOST} 'mysql -u ${PROD_USER} -p${PROD_PASS} ${PROD_DB} < /tmp/migration-batch.sql 2>&1; echo "RC=$?"'`,
      { encoding: 'utf8', timeout: 120000 }
    );
    console.log(out);
  } catch (e) { console.log(e.stdout || e.message); }

  console.log('\nVerifying...');
  try {
    const v = execSync(
      `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no ubuntu@${PROD_HOST} 'mysql -u ${PROD_USER} -p${PROD_PASS} -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema=\\x27${PROD_DB}\\x27 AND table_rows > 0 ORDER BY table_rows DESC;" 2>&1'`,
      { encoding: 'utf8', timeout: 30000 }
    );
    console.log(v);
  } catch (e) { console.log(e.stdout || e.message); }

  try { execSync(`ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no ubuntu@${PROD_HOST} 'rm -f /tmp/migration-batch.sql'`, { timeout: 10000 }); } catch(e){}
  fs.unlinkSync(sqlFile);
  console.log('=== Done ===');
}

main().catch(e => { console.error(e); process.exit(1); });
