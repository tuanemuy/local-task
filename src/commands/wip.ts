import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";
import { validateTaskId, handleCommandError } from "../utils/validation";

export async function wip(
  dbConnection: DatabaseConnection,
  category: string,
  id: string,
  comment?: string,
) {
  const { db } = dbConnection;

  try {
    const taskId = validateTaskId(id);

    const result = await db
      .update(schema.tasks)
      .set({
        status: "wip",
        comment: comment || null,
      })
      .where(
        and(eq(schema.tasks.category, category), eq(schema.tasks.id, taskId)),
      );

    if (result.changes === 0) {
      console.error(`Task with id ${id} not found in category '${category}'`);
      throw new Error(`Task with id ${id} not found`);
    }

    console.log(`Task ${id} marked as work in progress`);
  } catch (error) {
    handleCommandError("mark task as wip", error);
  }
}
