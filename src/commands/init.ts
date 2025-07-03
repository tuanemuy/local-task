import { existsSync } from "node:fs";
import { getDbPath } from "../utils/db";
import { runMigrations } from "../db/migrate";

export async function init(): Promise<void> {
  try {
    const dbPath = getDbPath();

    if (existsSync(dbPath)) {
      console.log(`Database already exists at: ${dbPath}`);
      console.log("Use '--force' to reinitialize the database");
      return;
    }

    console.log(`Initializing tdlite database at: ${dbPath}`);
    await runMigrations(dbPath);
    console.log("tdlite initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize tdlite:", error);
    throw error;
  }
}

export async function initForce(): Promise<void> {
  try {
    const dbPath = getDbPath();
    console.log(`Reinitializing tdlite database at: ${dbPath}`);
    await runMigrations(dbPath);
    console.log("tdlite reinitialized successfully!");
  } catch (error) {
    console.error("Failed to reinitialize tdlite:", error);
    throw error;
  }
}
