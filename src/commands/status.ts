import { sql } from "drizzle-orm";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";
import { stringWidth, padEnd } from "../utils/string-width";

interface StatusSummary {
  category: string;
  wipCount: number;
  doneCount: number;
}

export async function status(dbConnection: DatabaseConnection) {
  const { db } = dbConnection;

  try {
    // Query to get counts by category and status
    const results = await db
      .select({
        category: schema.tasks.category,
        status: schema.tasks.status,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(schema.tasks)
      .groupBy(schema.tasks.category, schema.tasks.status);

    // Transform results into summary format
    const summaryMap = new Map<string, StatusSummary>();

    for (const result of results) {
      let summary = summaryMap.get(result.category);
      if (!summary) {
        summary = {
          category: result.category,
          wipCount: 0,
          doneCount: 0,
        };
        summaryMap.set(result.category, summary);
      }

      if (result.status === "wip") {
        summary.wipCount = result.count;
      } else if (result.status === "done") {
        summary.doneCount = result.count;
      }
    }

    const summaries = Array.from(summaryMap.values());

    if (summaries.length === 0) {
      console.log("No tasks found in any category");
      return;
    }

    // Calculate column widths based on actual content
    const cols = {
      category: Math.max(8, ...summaries.map((s) => stringWidth(s.category))),
      wip: Math.max(
        3,
        ...summaries.map((s) => stringWidth(s.wipCount.toString())),
      ),
      done: Math.max(
        4,
        ...summaries.map((s) => stringWidth(s.doneCount.toString())),
      ),
    };

    // Header
    console.log(
      `${padEnd("Category", cols.category)} | ` +
        `${padEnd("WIP", cols.wip)} | ` +
        `${padEnd("Done", cols.done)}`,
    );

    // Separator
    console.log(
      `${"-".repeat(cols.category)}-+-` +
        `${"-".repeat(cols.wip)}-+-` +
        `${"-".repeat(cols.done)}`,
    );

    // Data rows
    for (const summary of summaries) {
      console.log(
        `${padEnd(summary.category, cols.category)} | ` +
          `${padEnd(summary.wipCount.toString(), cols.wip)} | ` +
          `${padEnd(summary.doneCount.toString(), cols.done)}`,
      );
    }
  } catch (error) {
    console.error("Failed to show status:", error);
    throw error;
  }
}
