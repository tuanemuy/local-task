import { existsSync } from "node:fs";
import path from "node:path";
import { createDatabase } from "../db";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import type { schema } from "../db";

export function getDbPath(): string {
  // Find the project root by looking for package.json
  let currentDir = process.cwd();
  let projectRoot = null;

  // Search up the directory tree for package.json
  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, "package.json"))) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (!projectRoot) {
    throw new Error("Could not find project root (no package.json found)");
  }

  return path.join(projectRoot, "tasks.db");
}

export function getDb(): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    console.error(`Database not found at: ${dbPath}`);
    console.error("Please run 'tdlite init' to initialize the database.");
    process.exit(1);
  }

  return createDatabase(dbPath);
}

export function getTestDb(): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  return createDatabase(":memory:");
}

export type DatabaseConnection = {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
};
