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
    const migrationsFolder = findMigrationsFolder();

    migrate(db, { migrationsFolder });
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    sqlite.close();
  }
}

function findMigrationsFolder(): string {
  // First, try to find project root using reliable package.json detection
  const projectRoot = findProjectRoot();

  // Possible migration folder locations, ordered by reliability
  const possibleLocations: string[] = [
    // 1. Project root drizzle folder (most reliable - same logic as getDbPath)
    projectRoot ? path.join(projectRoot, "drizzle") : null,
    // 2. Current working directory drizzle folder (good fallback)
    path.join(process.cwd(), "drizzle"),
    // 3. Production: from dist directory to project root
    path.join(__dirname, "../drizzle"),
    // 4. Development: from src/db directory to project root
    path.join(__dirname, "../../drizzle"),
  ].filter((location): location is string => location !== null);

  for (const location of possibleLocations) {
    if (existsSync(location)) {
      return location;
    }
  }

  // If no migration folder found, provide helpful error message
  const attemptedPaths = possibleLocations.map((p) => `  - ${p}`).join("\n");
  throw new Error(
    `Migration folder not found. Attempted locations:\n${attemptedPaths}\n\n` +
      "Please ensure the drizzle migrations folder exists in one of these locations.",
  );
}

function findProjectRoot(): string | null {
  // Search up from the current file location first
  let currentDir = __dirname;

  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Search up from process.cwd() as fallback
  currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}
