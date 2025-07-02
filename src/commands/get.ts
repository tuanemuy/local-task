import { eq, and, or } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

export async function get(
  dbConnection: DatabaseConnection,
  category: string,
  idOrCustomId: string,
) {
  const { db } = dbConnection;

  try {
    // Try to parse as number for id (only non-negative integers are considered valid IDs)
    const id = Number.parseInt(idOrCustomId, 10);
    const isValidNumericId =
      !Number.isNaN(id) && id >= 0 && /^\d+$/.test(idOrCustomId);

    const task = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.category, category),
          or(
            isValidNumericId ? eq(schema.tasks.id, id) : undefined,
            eq(schema.tasks.customId, idOrCustomId),
          ),
        ),
      );

    if (task.length > 0) {
      console.log(JSON.stringify(task[0], null, 2));
    } else {
      console.error(
        `Task not found with ${isValidNumericId ? "id" : "customId"}: ${idOrCustomId}`,
      );
      throw new Error(`Task not found: ${idOrCustomId}`);
    }
  } catch (error) {
    console.error("Failed to get task:", error);
    throw error;
  }
}
