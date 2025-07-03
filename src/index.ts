#!/usr/bin/env node
import * as commands from "./commands";
import { getDb } from "./utils/db";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const [command, ...params] = args;

  // Handle init command separately (doesn't require database connection)
  if (command === "init") {
    try {
      if (params.includes("--force")) {
        await commands.initForce();
      } else {
        await commands.init();
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      process.exit(1);
    }
    return;
  }

  const dbConnection = getDb();

  try {
    switch (command) {
      case "add": {
        if (params.length !== 2) {
          console.error("Usage: tdlite add <category> <jsonArray>");
          process.exit(1);
        }
        await commands.add(dbConnection, params[0], params[1]);
        break;
      }

      case "get": {
        if (params.length !== 2) {
          console.error("Usage: tdlite get <category> <id or customId>");
          process.exit(1);
        }
        await commands.get(dbConnection, params[0], params[1]);
        break;
      }

      case "search": {
        if (params.length !== 2) {
          console.error("Usage: tdlite search <category> <query>");
          process.exit(1);
        }
        await commands.search(dbConnection, params[0], params[1]);
        break;
      }

      case "list": {
        if (params.length !== 1) {
          console.error("Usage: tdlite list <category>");
          process.exit(1);
        }
        await commands.list(dbConnection, params[0]);
        break;
      }

      case "todo": {
        if (params.length !== 1) {
          console.error("Usage: tdlite todo <category>");
          process.exit(1);
        }
        await commands.todo(dbConnection, params[0]);
        break;
      }

      case "done": {
        if (params.length < 2 || params.length > 3) {
          console.error("Usage: tdlite done <category> <id> [comment]");
          process.exit(1);
        }
        await commands.done(dbConnection, params[0], params[1], params[2]);
        break;
      }

      case "wip": {
        if (params.length < 2 || params.length > 3) {
          console.error("Usage: tdlite wip <category> <id> [comment]");
          process.exit(1);
        }
        await commands.wip(dbConnection, params[0], params[1], params[2]);
        break;
      }

      case "remove": {
        if (params.length !== 2) {
          console.error("Usage: tdlite remove <category> <id>");
          process.exit(1);
        }
        await commands.remove(dbConnection, params[0], params[1]);
        break;
      }

      case "show": {
        if (params.length !== 1) {
          console.error("Usage: tdlite show <category>");
          process.exit(1);
        }
        await commands.show(dbConnection, params[0]);
        break;
      }

      default: {
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  } finally {
    dbConnection.sqlite.close();
  }
}

function showHelp() {
  console.log(`tdlite - A task manager for npm projects

Usage:
  tdlite <command> [arguments]

Commands:
  init [--force]                   Initialize the database (required before first use)
  add <category> <jsonArray>       Upsert tasks to a category
  get <category> <id|customId>     Get a specific task
  search <category> <query>        Search tasks by customId, name, or description
  list <category>                  List all tasks in a category
  todo <category>                  List tasks with status "wip"
  done <category> <id> [comment]   Mark a task as done
  wip <category> <id> [comment]    Mark a task as work in progress
  remove <category> <id>           Remove a task
  show <category>                  Display tasks in table format

Examples:
  tdlite init                  # Initialize database
  tdlite add "backend" '[{"customId": "api-001", "name": "Create API" }]'
  tdlite get "backend" "api-001"
  tdlite search "backend" "API"
  tdlite done "backend" 1 "Completed the API implementation"`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
