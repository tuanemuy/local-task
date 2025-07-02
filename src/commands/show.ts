import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";
import { stringWidth, truncateString, padEnd } from "../utils/string-width";

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

    // Get terminal width (default to 120 if not available)
    const terminalWidth = process.stdout.columns || 120;

    // Define maximum widths for each column
    const maxColWidths = {
      id: 6,
      customId: 15,
      name: 20,
      description: Math.max(20, Math.floor(terminalWidth * 0.3)),
      status: 10,
      comment: Math.max(15, Math.floor(terminalWidth * 0.2)),
    };

    // Calculate column widths based on actual content (respecting max widths)
    const cols = {
      id: Math.min(
        maxColWidths.id,
        Math.max(2, ...tasks.map((t) => stringWidth(t.id.toString()))),
      ),
      customId: Math.min(
        maxColWidths.customId,
        Math.max(8, ...tasks.map((t) => stringWidth(t.customId || ""))),
      ),
      name: Math.min(
        maxColWidths.name,
        Math.max(4, ...tasks.map((t) => stringWidth(t.name || ""))),
      ),
      description: Math.min(
        maxColWidths.description,
        Math.max(11, ...tasks.map((t) => stringWidth(t.description || ""))),
      ),
      status: Math.min(
        maxColWidths.status,
        Math.max(6, ...tasks.map((t) => stringWidth(t.status || ""))),
      ),
      comment: Math.min(
        maxColWidths.comment,
        Math.max(7, ...tasks.map((t) => stringWidth(t.comment || ""))),
      ),
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
      // Truncate values if they exceed column width
      const id = truncateString(task.id.toString(), cols.id);
      const customId = truncateString(task.customId || "", cols.customId);
      const name = truncateString(task.name || "", cols.name);
      const description = truncateString(
        task.description || "",
        cols.description,
      );
      const status = truncateString(task.status || "", cols.status);
      const comment = truncateString(task.comment || "", cols.comment);

      console.log(
        `${padEnd(id, cols.id)} | ` +
          `${padEnd(customId, cols.customId)} | ` +
          `${padEnd(name, cols.name)} | ` +
          `${padEnd(description, cols.description)} | ` +
          `${padEnd(status, cols.status)} | ` +
          `${padEnd(comment, cols.comment)}`,
      );
    }
  } catch (error) {
    console.error("Failed to show tasks:", error);
    throw error;
  }
}
