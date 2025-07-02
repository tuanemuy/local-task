import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

export async function list(dbConnection: DatabaseConnection, category: string) {
  const { db } = dbConnection;

  try {
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.category, category));

    console.log(JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Failed to list tasks:", error);
    throw error;
  }
}
