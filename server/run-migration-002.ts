import "./load-env";
import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("🚀 Running 002_add_agentic_proctoring_schema migration...");
  try {
    const sqlPath = path.join(__dirname, "migrations", "002_add_agentic_proctoring_schema.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");
    // Strip line comments
    const cleanSql = sqlContent
      .split('\n')
      .map(line => line.trim().startsWith('--') ? '' : line)
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement) {
        console.log("Executing:", statement.substring(0, 60) + "...");
        await pool.query(statement);
      }
    }
    console.log("✅ Migration 002 executed successfully!");
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

run();
