import { eq, and, or } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";
import { handleCommandError } from "../utils/validation";

export async function wip(
  dbConnection: DatabaseConnection,
  category: string,
  idOrCustomId: string,
  comment?: string,
) {
  const { db } = dbConnection;

  try {
    // Try to parse as number for id (only positive integers are considered valid IDs)
    const id = Number.parseInt(idOrCustomId, 10);
    const isValidNumericId =
      !Number.isNaN(id) && id > 0 && /^\d+$/.test(idOrCustomId);

    const result = await db
      .update(schema.tasks)
      .set({
        status: "wip",
        comment: comment || null,
      })
      .where(
        and(
          eq(schema.tasks.category, category),
          or(
            isValidNumericId ? eq(schema.tasks.id, id) : undefined,
            eq(schema.tasks.customId, idOrCustomId),
          ),
        ),
      );

    if (result.changes === 0) {
      console.error(
        `Task not found with ${isValidNumericId ? "id" : "customId"}: ${idOrCustomId} in category '${category}'`,
      );
      throw new Error(`Task not found: ${idOrCustomId}`);
    }

    console.log(`Task ${idOrCustomId} marked as work in progress`);
  } catch (error) {
    handleCommandError("mark task as wip", error);
  }
}
