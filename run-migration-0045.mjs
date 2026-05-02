import { readFileSync } from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const sql = readFileSync("drizzle/0045_windy_queen_noir.sql", "utf-8");
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
for (const stmt of statements) {
  console.log("Executing:", stmt.substring(0, 80) + "...");
  await conn.execute(stmt);
}
console.log("Migration 0045 applied successfully");
await conn.end();
