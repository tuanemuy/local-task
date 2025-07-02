import { z } from "zod/v4";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const taskSchema = z.object({
  customId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["wip", "done"]).optional(),
  comment: z.string().optional(),
});

export async function add(
  dbConnection: DatabaseConnection,
  category: string,
  jsonArray: string,
) {
  const { db } = dbConnection;

  try {
    const parsed = JSON.parse(jsonArray);
    const tasks = z.array(taskSchema).parse(parsed);

    for (const task of tasks) {
      await db
        .insert(schema.tasks)
        .values({
          customId: task.customId,
          category,
          name: task.name,
          description: task.description,
          status: task.status || "wip",
          comment: task.comment,
        })
        .onConflictDoUpdate({
          target: [schema.tasks.customId, schema.tasks.category],
          set: {
            name: task.name,
            description: task.description,
            status: task.status || "wip",
            comment: task.comment,
          },
        });
    }

    console.log(
      `Successfully upserted ${tasks.length} tasks to category '${category}'`,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Invalid JSON format:", error.issues);
    } else if (error instanceof SyntaxError) {
      console.error("Invalid JSON:", error.message);
    } else {
      console.error("Failed to add tasks:", error);
    }
    throw error;
  }
}
