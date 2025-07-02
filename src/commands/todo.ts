import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

export async function todo(dbConnection: DatabaseConnection, category: string) {
  const { db } = dbConnection;

  try {
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.category, category),
          eq(schema.tasks.status, "wip"),
        ),
      );

    console.log(JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Failed to get todo tasks:", error);
    throw error;
  }
}
