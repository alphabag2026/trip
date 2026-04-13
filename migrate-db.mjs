#!/usr/bin/env node
/**
 * Manus DB → Production DB 데이터 마이그레이션 스크립트
 * 테이블별로 SELECT → INSERT REPLACE 방식으로 데이터 이관
 */
import mysql from "mysql2/promise";

const MANUS_DB_URL = process.env.DATABASE_URL;
const PROD_HOST = "18.136.229.243";
const PROD_DB = "meetup-travel_db";
const PROD_USER = "meetup-travel";
const PROD_PASS = "meetup-travelRev2026SecureDB";

// __drizzle_migrations는 제외 (프로덕션에서 자체 관리)
const SKIP_TABLES = ["__drizzle_migrations"];

function parseMysqlUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL: " + url);
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

async function main() {
  console.log("=== Manus → Production DB Migration ===\n");

  const srcCfg = parseMysqlUrl(MANUS_DB_URL);
  const srcConn = await mysql.createConnection({ ...srcCfg, ssl: { rejectUnauthorized: true }, connectTimeout: 30000 });
  console.log(`✅ Source DB connected: ${srcCfg.host}/${srcCfg.database}`);

  const dstConn = await mysql.createConnection({
    host: PROD_HOST, port: 3306, user: PROD_USER, password: PROD_PASS, database: PROD_DB,
    connectTimeout: 30000,
  });
  console.log(`✅ Target DB connected: ${PROD_HOST}/${PROD_DB}\n`);

  // Get all tables from source
  const [tables] = await srcConn.query("SHOW TABLES");
  const tableKey = Object.keys(tables[0])[0];
  const allTables = tables.map(t => t[tableKey]).filter(t => !SKIP_TABLES.includes(t));
  console.log(`📋 Tables to migrate: ${allTables.length}\n`);

  // Disable FK checks on target
  await dstConn.query("SET FOREIGN_KEY_CHECKS = 0");
  await dstConn.query("SET SESSION sql_mode = ''");

  let totalRows = 0;
  let errors = [];

  for (const table of allTables) {
    try {
      // Check if table exists in target
      const [targetTables] = await dstConn.query(`SHOW TABLES LIKE '${table}'`);
      if (targetTables.length === 0) {
        console.log(`⏭️  ${table} - not in target DB, skipping`);
        continue;
      }

      // Get row count
      const [countResult] = await srcConn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      const rowCount = countResult[0].cnt;
      if (rowCount === 0) {
        console.log(`⏭️  ${table} - 0 rows, skipping`);
        continue;
      }

      // Get all rows
      const [rows] = await srcConn.query(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      // Get column names
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(", ");
      const placeholders = columns.map(() => "?").join(", ");

      // Batch insert with REPLACE
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = batch.map(row => columns.map(c => row[c]));
        const multiPlaceholders = values.map(() => `(${placeholders})`).join(", ");
        const flatValues = values.flat();
        await dstConn.query(`REPLACE INTO \`${table}\` (${colList}) VALUES ${multiPlaceholders}`, flatValues);
        inserted += batch.length;
      }

      console.log(`✅ ${table} - ${inserted} rows migrated`);
      totalRows += inserted;
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message.substring(0, 100)}`);
      errors.push({ table, error: err.message });
    }
  }

  // Re-enable FK checks
  await dstConn.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log(`\n========================================`);
  console.log(`✅ Migration complete: ${totalRows} total rows`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} tables had errors:`);
    errors.forEach(e => console.log(`   - ${e.table}: ${e.error.substring(0, 80)}`));
  }

  await srcConn.end();
  await dstConn.end();
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
