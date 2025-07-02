import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(dbPath: string) {
  const { db, sqlite } = createDatabase(dbPath);

  try {
    const migrationsFolder = path.join(__dirname, "../../drizzle");
    migrate(db, { migrationsFolder });
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    sqlite.close();
  }
}
