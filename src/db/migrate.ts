import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDatabase } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(dbPath: string) {
  const { db, sqlite } = createDatabase(dbPath);

  try {
    // In development: src/db/migrate.ts -> ../../drizzle
    // In production: dist/index.js -> ./drizzle (copied during build)
    let migrationsFolder = path.join(__dirname, "../../drizzle");

    // Check if we're running from dist (production) and drizzle folder exists there
    const distDrizzleFolder = path.join(__dirname, "drizzle");
    if (__dirname.includes("dist") && existsSync(distDrizzleFolder)) {
      migrationsFolder = distDrizzleFolder;
    }

    migrate(db, { migrationsFolder });
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    sqlite.close();
  }
}
