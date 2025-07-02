import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";
import { stringWidth, padEnd } from "../utils/string-width";

export async function show(dbConnection: DatabaseConnection, category: string) {
  const { db } = dbConnection;

  try {
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.category, category));

    if (tasks.length === 0) {
      console.log(`No tasks found in category '${category}'`);
      return;
    }

    // Calculate column widths based on actual content
    const cols = {
      id: Math.max(2, ...tasks.map((t) => stringWidth(t.id.toString()))),
      customId: Math.max(8, ...tasks.map((t) => stringWidth(t.customId || ""))),
      name: Math.max(4, ...tasks.map((t) => stringWidth(t.name || ""))),
      description: Math.max(
        11,
        ...tasks.map((t) => stringWidth(t.description || "")),
      ),
      status: Math.max(6, ...tasks.map((t) => stringWidth(t.status || ""))),
      comment: Math.max(7, ...tasks.map((t) => stringWidth(t.comment || ""))),
    };

    // Header
    console.log(
      `${padEnd("ID", cols.id)} | ` +
        `${padEnd("CustomID", cols.customId)} | ` +
        `${padEnd("Name", cols.name)} | ` +
        `${padEnd("Description", cols.description)} | ` +
        `${padEnd("Status", cols.status)} | ` +
        `${padEnd("Comment", cols.comment)}`,
    );

    // Separator
    console.log(
      `${"-".repeat(cols.id)}-+-` +
        `${"-".repeat(cols.customId)}-+-` +
        `${"-".repeat(cols.name)}-+-` +
        `${"-".repeat(cols.description)}-+-` +
        `${"-".repeat(cols.status)}-+-` +
        `${"-".repeat(cols.comment)}`,
    );

    // Data rows
    for (const task of tasks) {
      console.log(
        `${padEnd(task.id.toString(), cols.id)} | ` +
          `${padEnd(task.customId || "", cols.customId)} | ` +
          `${padEnd(task.name || "", cols.name)} | ` +
          `${padEnd(task.description || "", cols.description)} | ` +
          `${padEnd(task.status || "", cols.status)} | ` +
          `${padEnd(task.comment || "", cols.comment)}`,
      );
    }
  } catch (error) {
    console.error("Failed to show tasks:", error);
    throw error;
  }
}
