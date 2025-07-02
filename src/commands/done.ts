import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

export async function done(
  dbConnection: DatabaseConnection,
  category: string,
  id: string,
  comment?: string,
) {
  const { db } = dbConnection;

  try {
    // Validate ID format
    if (!id || id.trim() === "" || !/^\d+$/.test(id)) {
      console.error("Invalid task ID");
      throw new Error("Invalid task ID");
    }

    const taskId = Number.parseInt(id, 10);
    if (Number.isNaN(taskId) || taskId <= 0) {
      console.error("Invalid task ID");
      throw new Error("Invalid task ID");
    }

    const result = await db
      .update(schema.tasks)
      .set({
        status: "done",
        comment: comment || null,
      })
      .where(
        and(eq(schema.tasks.category, category), eq(schema.tasks.id, taskId)),
      );

    if (result.changes === 0) {
      console.error(`Task with id ${id} not found in category '${category}'`);
      throw new Error(`Task with id ${id} not found`);
    }

    console.log(`Task ${id} marked as done`);
  } catch (error) {
    console.error("Failed to mark task as done:", error);
    throw error;
  }
}
