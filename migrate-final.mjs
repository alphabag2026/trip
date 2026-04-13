import mysql from 'mysql2/promise';
import { exec } from 'child_process';

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);
const MANUS = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
};

// Production DB via SSH tunnel
const PROD = {
  host: '127.0.0.1',
  port: 13307,
  user: 'meetup-travel',
  password: 'MeetupTravel2024',
  database: 'meetup-travel_db',
  connectTimeout: 30000,
};

// Tables to migrate (have data in Manus, empty in production)
const TABLES = [
  'users', 'user_profiles', 'registrations',
  'partner_categories', 'organization_members', 'team_schedules',
  'organizations', 'translation_requests', 'partners',
  'vat_rates', 'ride_searches', 'notes',
  'payment_gateway_config', 'onboarding_progress', 'travel_searches',
  'passport_info', 'organizer_approvals', 'schedule_events',
];

async function startSSHTunnel() {
  return new Promise((resolve, reject) => {
    const proc = exec(
      `ssh -i "/home/ubuntu/upload/LightsailDefaultKey-ap-southeast-1(8).pem" -o StrictHostKeyChecking=no -L 13307:localhost:3306 ubuntu@18.136.229.243 -N`,
      (err) => { if (err) console.log('SSH tunnel closed:', err.message); }
    );
    setTimeout(() => resolve(proc), 5000);
  });
}

async function migrateTable(tableName) {
  let srcConn, dstConn;
  try {
    srcConn = await mysql.createConnection(MANUS);
    dstConn = await mysql.createConnection(PROD);
    
    // Get row count
    const [countRows] = await srcConn.execute(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    const total = countRows[0].cnt;
    if (total === 0) {
      console.log(`  ${tableName}: 0 rows (skip)`);
      return { table: tableName, rows: 0, status: 'skipped' };
    }
    
    // Disable FK checks
    await dstConn.execute('SET FOREIGN_KEY_CHECKS=0');
    
    // Get all rows in batches
    const BATCH = 100;
    let offset = 0;
    let inserted = 0;
    
    while (offset < total) {
      const [rows] = await srcConn.execute(`SELECT * FROM \`${tableName}\` LIMIT ${BATCH} OFFSET ${offset}`);
      if (rows.length === 0) break;
      
      // Get column names from first row
      const cols = Object.keys(rows[0]);
      const colStr = cols.map(c => `\`${c}\``).join(',');
      const placeholders = cols.map(() => '?').join(',');
      
      for (const row of rows) {
        const values = cols.map(c => row[c]);
        try {
          await dstConn.execute(
            `REPLACE INTO \`${tableName}\` (${colStr}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (e) {
          // Skip individual row errors
          console.log(`    Row error in ${tableName}: ${e.message.slice(0, 80)}`);
        }
      }
      offset += BATCH;
    }
    
    await dstConn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log(`  ${tableName}: ${inserted}/${total} rows migrated`);
    return { table: tableName, rows: inserted, status: 'ok' };
  } catch (e) {
    console.log(`  ${tableName}: ERROR - ${e.message.slice(0, 100)}`);
    return { table: tableName, rows: 0, status: 'error', error: e.message };
  } finally {
    if (srcConn) await srcConn.end().catch(() => {});
    if (dstConn) await dstConn.end().catch(() => {});
  }
}

async function main() {
  console.log('=== Starting DB Migration (Manus → Production) ===');
  console.log('Starting SSH tunnel...');
  const tunnel = await startSSHTunnel();
  
  console.log('Migrating tables...');
  const results = [];
  for (const table of TABLES) {
    const r = await migrateTable(table);
    results.push(r);
  }
  
  console.log('\n=== Migration Summary ===');
  let totalRows = 0;
  for (const r of results) {
    console.log(`  ${r.table}: ${r.rows} rows (${r.status})`);
    totalRows += r.rows;
  }
  console.log(`\nTotal: ${totalRows} rows migrated across ${results.filter(r => r.status === 'ok').length} tables`);
  
  tunnel.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
