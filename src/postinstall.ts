#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./db/migrate";

async function postinstall() {
  try {
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
      console.error("Could not find project root (no package.json found)");
      process.exit(1);
    }

    const dbPath = path.join(projectRoot, "tasks.db");
    console.log(`Setting up local-task database at: ${dbPath}`);

    await runMigrations(dbPath);
    console.log("local-task setup completed successfully!");
  } catch (error) {
    console.error("Failed to setup local-task:", error);
    process.exit(1);
  }
}

postinstall();
