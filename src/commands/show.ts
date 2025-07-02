import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

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

    // Calculate column widths
    const cols = {
      id: Math.max(2, ...tasks.map((t) => t.id.toString().length)),
      customId: Math.max(8, ...tasks.map((t) => (t.customId || "").length)),
      name: Math.max(4, ...tasks.map((t) => (t.name || "").length)),
      description: Math.max(
        11,
        ...tasks.map((t) => (t.description || "").length),
      ),
      status: 6,
      comment: Math.max(7, ...tasks.map((t) => (t.comment || "").length)),
    };

    // Header
    console.log(
      `${"ID".padEnd(cols.id)} | ` +
        `${"CustomID".padEnd(cols.customId)} | ` +
        `${"Name".padEnd(cols.name)} | ` +
        `${"Description".padEnd(cols.description)} | ` +
        `${"Status".padEnd(cols.status)} | ` +
        `${"Comment".padEnd(cols.comment)}`,
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
        `${task.id.toString().padEnd(cols.id)} | ` +
          `${(task.customId || "").padEnd(cols.customId)} | ` +
          `${(task.name || "").padEnd(cols.name)} | ` +
          `${(task.description || "").padEnd(cols.description)} | ` +
          `${(task.status || "").padEnd(cols.status)} | ` +
          `${(task.comment || "").padEnd(cols.comment)}`,
      );
    }
  } catch (error) {
    console.error("Failed to show tasks:", error);
    throw error;
  }
}
