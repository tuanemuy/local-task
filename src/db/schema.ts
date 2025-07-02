import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customId: text("customId").notNull(),
    category: text("category").notNull(),
    name: text("name"),
    description: text("description"),
    status: text("status", { enum: ["wip", "done"] }).default("wip"),
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    customIdCategoryUnique: uniqueIndex("tasks_customId_category_unique").on(
      table.customId,
      table.category,
    ),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
