import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, and } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { add } from "./add";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("add command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("valid inputs", () => {
    it("should add single task successfully", async () => {
      const jsonArray = JSON.stringify([
        {
          customId: "task-1",
          name: "Test Task",
          description: "Test Description",
          status: "wip",
          comment: "Initial comment",
        },
      ]);

      await expect(
        add(dbConnection, "test-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "test-category"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        customId: "task-1",
        category: "test-category",
        name: "Test Task",
        description: "Test Description",
        status: "wip",
        comment: "Initial comment",
      });
    });

    it("should add multiple tasks successfully", async () => {
      const jsonArray = JSON.stringify([
        { customId: "task-1", name: "Task 1" },
        { customId: "task-2", name: "Task 2", description: "Description 2" },
        { customId: "task-3", status: "done", comment: "Comment 3" },
      ]);

      await expect(
        add(dbConnection, "bulk-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "bulk-category"));

      expect(tasks).toHaveLength(3);
      expect(tasks.map((t) => t.customId)).toEqual([
        "task-1",
        "task-2",
        "task-3",
      ]);
    });

    it("should upsert existing tasks based on customId and category", async () => {
      // First insert
      const initialJson = JSON.stringify([
        {
          customId: "task-1",
          name: "Original Name",
          description: "Original Description",
        },
      ]);
      await add(dbConnection, "upsert-category", initialJson);

      // Verify initial insert
      let tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.customId, "task-1"),
            eq(schema.tasks.category, "upsert-category"),
          ),
        );

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe("Original Name");

      // Upsert with new data
      const upsertJson = JSON.stringify([
        {
          customId: "task-1",
          name: "Updated Name",
          description: "Updated Description",
          comment: "Updated comment",
        },
      ]);
      await add(dbConnection, "upsert-category", upsertJson);

      // Verify upsert
      tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.customId, "task-1"),
            eq(schema.tasks.category, "upsert-category"),
          ),
        );

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe("Updated Name");
      expect(tasks[0].description).toBe("Updated Description");
      expect(tasks[0].comment).toBe("Updated comment");
    });

    it("should handle minimal required fields only", async () => {
      const jsonArray = JSON.stringify([{ customId: "minimal-task" }]);

      await expect(
        add(dbConnection, "minimal-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "minimal-category"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        customId: "minimal-task",
        category: "minimal-category",
        status: "wip",
        name: null,
        description: null,
        comment: null,
      });
    });

    it("should handle empty array", async () => {
      const jsonArray = JSON.stringify([]);

      await expect(
        add(dbConnection, "empty-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "empty-category"));

      expect(tasks).toHaveLength(0);
    });
  });

  describe("boundary cases", () => {
    it("should handle empty strings", async () => {
      const jsonArray = JSON.stringify([
        {
          customId: "",
          name: "",
          description: "",
          comment: "",
        },
      ]);

      await expect(
        add(dbConnection, "empty-strings", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "empty-strings"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0].customId).toBe("");
      expect(tasks[0].name).toBe("");
    });

    it("should handle very long strings", async () => {
      const longString = "a".repeat(1000);
      const jsonArray = JSON.stringify([
        {
          customId: `long-${longString}`,
          name: longString,
          description: longString,
          comment: longString,
        },
      ]);

      await expect(
        add(dbConnection, "long-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "long-category"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe(longString);
    });

    it("should handle special characters and unicode", async () => {
      const jsonArray = JSON.stringify([
        {
          customId: "特殊文字-éñçödé-🚀",
          name: "Task with émojis 🎉 and ñSpecial chars",
          description: "Description with 中文 and русский",
          comment: "Comment with symbols: @#$%^&*()[]{}|;':\",./<>?",
        },
      ]);

      await expect(
        add(dbConnection, "unicode-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "unicode-category"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0].customId).toBe("特殊文字-éñçödé-🚀");
    });
  });

  describe("error cases", () => {
    it("should throw error for invalid JSON", async () => {
      const invalidJson = '{"customId": "test", invalid}';

      await expect(
        add(dbConnection, "test-category", invalidJson),
      ).rejects.toThrow();
    });

    it("should throw error for malformed JSON array", async () => {
      const notAnArray = '{"customId": "test"}'; // object instead of array

      await expect(
        add(dbConnection, "test-category", notAnArray),
      ).rejects.toThrow();
    });

    it("should throw error for missing customId", async () => {
      const jsonArray = JSON.stringify([{ name: "Task without customId" }]);

      await expect(
        add(dbConnection, "test-category", jsonArray),
      ).rejects.toThrow();
    });

    it("should throw error for invalid status value", async () => {
      const jsonArray = JSON.stringify([
        { customId: "test", status: "invalid-status" },
      ]);

      await expect(
        add(dbConnection, "test-category", jsonArray),
      ).rejects.toThrow();
    });

    it("should throw error for non-string customId", async () => {
      const jsonArray = JSON.stringify([{ customId: 123, name: "Test" }]);

      await expect(
        add(dbConnection, "test-category", jsonArray),
      ).rejects.toThrow();
    });

    it("should throw error for empty JSON string", async () => {
      await expect(add(dbConnection, "test-category", "")).rejects.toThrow();
    });

    it("should throw error for null JSON", async () => {
      const jsonArray = JSON.stringify(null);

      await expect(
        add(dbConnection, "test-category", jsonArray),
      ).rejects.toThrow();
    });

    it("should handle duplicate customId within same request", async () => {
      const jsonArray = JSON.stringify([
        { customId: "duplicate", name: "First" },
        { customId: "duplicate", name: "Second" },
      ]);

      // This should succeed - the second one should overwrite the first due to upsert behavior
      await expect(
        add(dbConnection, "duplicate-category", jsonArray),
      ).resolves.not.toThrow();

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "duplicate-category"));

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe("Second");
    });
  });

  describe("status handling", () => {
    it("should default status to 'wip' when not provided", async () => {
      const jsonArray = JSON.stringify([
        { customId: "no-status-task", name: "Task without status" },
      ]);

      await add(dbConnection, "status-category", jsonArray);

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "status-category"));

      expect(tasks[0].status).toBe("wip");
    });

    it("should accept valid status values", async () => {
      const jsonArray = JSON.stringify([
        { customId: "wip-task", status: "wip" },
        { customId: "done-task", status: "done" },
      ]);

      await add(dbConnection, "status-category", jsonArray);

      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "status-category"));

      const wipTask = tasks.find((t) => t.customId === "wip-task");
      const doneTask = tasks.find((t) => t.customId === "done-task");

      expect(wipTask?.status).toBe("wip");
      expect(doneTask?.status).toBe("done");
    });
  });
});
