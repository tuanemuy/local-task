import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function createDatabase(dbPath: string): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export { schema };
