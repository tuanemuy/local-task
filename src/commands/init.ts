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

    console.log(`Initializing local-task database at: ${dbPath}`);
    await runMigrations(dbPath);
    console.log("local-task initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize local-task:", error);
    throw error;
  }
}

export async function initForce(): Promise<void> {
  try {
    const dbPath = getDbPath();
    console.log(`Reinitializing local-task database at: ${dbPath}`);
    await runMigrations(dbPath);
    console.log("local-task reinitialized successfully!");
  } catch (error) {
    console.error("Failed to reinitialize local-task:", error);
    throw error;
  }
}
