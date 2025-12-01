/**
 * Load environment variables - must be imported first
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from root directory
config({ path: resolve(process.cwd(), ".env") });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file!");
  console.error("Please ensure .env file exists and contains DATABASE_URL");
  process.exit(1);
}

