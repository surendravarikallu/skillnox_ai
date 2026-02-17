import "./load-env";
import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log("🚀 Running performance optimization indexes migration...");

    try {
        const sqlPath = path.join(__dirname, "migrations", "001_add_performance_indexes.sql");
        const sqlContent = fs.readFileSync(sqlPath, "utf-8");

        // Split by statement and filter out comments
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
            if (statement) {
                await pool.query(statement);
            }
        }

        console.log("✅ Migration completed successfully!");
        console.log("📊 Performance indexes created");

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
