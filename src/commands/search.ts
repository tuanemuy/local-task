import { eq, and, or, sql } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

export async function search(
  dbConnection: DatabaseConnection,
  category: string,
  query: string,
) {
  const { db } = dbConnection;

  try {
    // Escape SQL LIKE wildcards in the query
    const escapedQuery = query.replace(/[%_]/g, "\\$&");
    const searchPattern = `%${escapedQuery}%`;

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.category, category),
          or(
            sql`${schema.tasks.customId} LIKE ${searchPattern} ESCAPE '\\'`,
            sql`${schema.tasks.name} LIKE ${searchPattern} ESCAPE '\\'`,
            sql`${schema.tasks.description} LIKE ${searchPattern} ESCAPE '\\'`,
          ),
        ),
      );

    console.log(JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Failed to search tasks:", error);
    throw error;
  }
}
