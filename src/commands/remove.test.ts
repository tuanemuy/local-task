import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, and } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { remove } from "./remove";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("remove command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data
    await dbConnection.db.insert(schema.tasks).values([
      {
        id: 1,
        customId: "task-001",
        category: "development",
        name: "Task to be removed",
        description: "This task will be deleted",
        status: "wip",
        comment: "Initial comment",
      },
      {
        id: 2,
        customId: "task-002",
        category: "development",
        name: "Another task",
        description: "Another task for testing",
        status: "done",
        comment: null,
      },
      {
        id: 3,
        customId: "task-003",
        category: "testing",
        name: "Different category task",
        description: "Task in different category",
        status: "wip",
        comment: "Testing comment",
      },
      {
        id: 4,
        customId: "task-004",
        category: "development",
        name: "Keep this task",
        description: "This task should remain",
        status: "done",
        comment: "Completed task",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("successful operations", () => {
    it("should remove task successfully", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        remove(dbConnection, "development", "1"),
      ).resolves.not.toThrow();

      // Verify the task was removed
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(task).toHaveLength(0);

      expect(consoleSpy).toHaveBeenCalledWith("Task 1 removed successfully");
      consoleSpy.mockRestore();
    });

    it("should remove task without affecting other tasks", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Get initial count of other tasks
      const otherTasksBefore = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(otherTasksBefore).toHaveLength(3); // Tasks 1, 2, 4

      await remove(dbConnection, "development", "1");

      // Verify other tasks remain
      const otherTasksAfter = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(otherTasksAfter).toHaveLength(2); // Tasks 2, 4
      expect(otherTasksAfter.map((t) => t.id)).toEqual([2, 4]);

      consoleSpy.mockRestore();
    });

    it("should remove task from specific category only", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(remove(dbConnection, "testing", "3")).resolves.not.toThrow();

      // Verify the testing task was removed
      const testingTasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "testing"));

      expect(testingTasks).toHaveLength(0);

      // Verify development tasks remain unchanged
      const developmentTasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(developmentTasks).toHaveLength(3); // Tasks 1, 2, 4

      consoleSpy.mockRestore();
    });

    it("should handle removing tasks with different statuses", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Remove wip task
      await remove(dbConnection, "development", "1");

      // Remove done task
      await remove(dbConnection, "development", "2");

      // Verify both were removed
      const tasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(tasks).toHaveLength(1); // Only task 4 remains
      expect(tasks[0].id).toBe(4);

      consoleSpy.mockRestore();
    });

    it("should handle removing tasks with various field values", async () => {
      // Insert task with special values
      await dbConnection.db.insert(schema.tasks).values({
        id: 5,
        customId: "special-task",
        category: "development",
        name: null,
        description: null,
        status: "wip",
        comment: null,
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        remove(dbConnection, "development", "5"),
      ).resolves.not.toThrow();

      // Verify the task was removed
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 5), eq(schema.tasks.category, "development")),
        );

      expect(task).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe("category filtering", () => {
    it("should not remove task from different category", async () => {
      await expect(remove(dbConnection, "wrong-category", "1")).rejects.toThrow(
        "Task with id 1 not found",
      );

      // Verify the task still exists
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(task).toHaveLength(1);
    });

    it("should require exact category match", async () => {
      await expect(remove(dbConnection, "Development", "1")).rejects.toThrow(
        "Task with id 1 not found",
      );

      // Verify the task still exists
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(task).toHaveLength(1);
    });
  });

  describe("error cases", () => {
    it("should throw error for non-existent task ID", async () => {
      await expect(remove(dbConnection, "development", "999")).rejects.toThrow(
        "Task with id 999 not found",
      );
    });

    it("should throw error for invalid ID format", async () => {
      await expect(remove(dbConnection, "development", "abc")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for empty ID", async () => {
      await expect(remove(dbConnection, "development", "")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for whitespace-only ID", async () => {
      await expect(remove(dbConnection, "development", "   ")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for negative ID", async () => {
      await expect(remove(dbConnection, "development", "-1")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for decimal ID", async () => {
      await expect(remove(dbConnection, "development", "1.5")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for ID with leading zeros followed by non-numeric", async () => {
      await expect(remove(dbConnection, "development", "01a")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for mixed alphanumeric ID", async () => {
      await expect(remove(dbConnection, "development", "1a2")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should throw error for very large ID", async () => {
      const largeId = "9".repeat(20); // 20 digits
      await expect(
        remove(dbConnection, "development", largeId),
      ).rejects.toThrow(`Task with id ${largeId} not found`);
    });
  });

  describe("boundary cases", () => {
    it("should handle zero ID", async () => {
      await expect(remove(dbConnection, "development", "0")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should handle ID with leading zeros", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        remove(dbConnection, "development", "001"),
      ).resolves.not.toThrow();

      // Verify the task was removed (leading zeros should be ignored)
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(task).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle maximum safe integer ID", async () => {
      const maxSafeId = Number.MAX_SAFE_INTEGER.toString();
      await expect(
        remove(dbConnection, "development", maxSafeId),
      ).rejects.toThrow(`Task with id ${maxSafeId} not found`);
    });

    it("should handle special characters in category", async () => {
      // Insert task with special character category
      await dbConnection.db.insert(schema.tasks).values({
        id: 5,
        customId: "special-cat-task",
        category: "special-category!@#$%",
        name: "Special category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        remove(dbConnection, "special-category!@#$%", "5"),
      ).resolves.not.toThrow();

      // Verify the task was removed
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.id, 5),
            eq(schema.tasks.category, "special-category!@#$%"),
          ),
        );

      expect(task).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle unicode category names", async () => {
      // Insert task with unicode category
      await dbConnection.db.insert(schema.tasks).values({
        id: 5,
        customId: "unicode-cat-task",
        category: "カテゴリー中文🚀",
        name: "Unicode category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        remove(dbConnection, "カテゴリー中文🚀", "5"),
      ).resolves.not.toThrow();

      // Verify the task was removed
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.id, 5),
            eq(schema.tasks.category, "カテゴリー中文🚀"),
          ),
        );

      expect(task).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle scientific notation ID", async () => {
      await expect(remove(dbConnection, "development", "1e2")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should handle hexadecimal ID", async () => {
      await expect(remove(dbConnection, "development", "0xFF")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should handle ID with plus sign", async () => {
      await expect(remove(dbConnection, "development", "+1")).rejects.toThrow(
        "Invalid task ID",
      );
    });

    it("should handle removing same task twice", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Remove task first time
      await expect(
        remove(dbConnection, "development", "1"),
      ).resolves.not.toThrow();

      // Try to remove same task again
      await expect(remove(dbConnection, "development", "1")).rejects.toThrow(
        "Task with id 1 not found",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("data integrity", () => {
    it("should completely remove task data", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Verify task exists before removal
      const taskBefore = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(taskBefore).toHaveLength(1);

      await remove(dbConnection, "development", "1");

      // Verify task is completely gone
      const taskAfter = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        );

      expect(taskAfter).toHaveLength(0);

      // Also verify by searching with any field
      const taskById = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, 1));

      expect(taskById).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should not affect database integrity after removal", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Get total count before removal
      const totalBefore = await dbConnection.db.select().from(schema.tasks);
      expect(totalBefore).toHaveLength(4);

      await remove(dbConnection, "development", "1");

      // Get total count after removal
      const totalAfter = await dbConnection.db.select().from(schema.tasks);
      expect(totalAfter).toHaveLength(3);

      // Verify all remaining tasks are intact
      for (const task of totalAfter) {
        expect(task.id).toBeDefined();
        expect(task.customId).toBeDefined();
        expect(task.category).toBeDefined();
        expect(task.status).toBeDefined();
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      }

      consoleSpy.mockRestore();
    });

    it("should handle removing tasks with relationships (if any)", async () => {
      // This test ensures removal works even if tasks have complex data
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Insert task with all possible fields filled
      await dbConnection.db.insert(schema.tasks).values({
        id: 5,
        customId: "complex-task-データ🚀",
        category: "complex-category中文",
        name: "Complex task with all fields",
        description:
          "Very detailed description with unicode: データベース中文🎉",
        status: "wip",
        comment: "Complex comment with special chars: !@#$%^&*()",
      });

      await expect(
        remove(dbConnection, "complex-category中文", "5"),
      ).resolves.not.toThrow();

      // Verify removal
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, 5));

      expect(task).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe("bulk operations", () => {
    it("should handle removing multiple tasks sequentially", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Remove multiple tasks
      await remove(dbConnection, "development", "1");
      await remove(dbConnection, "development", "2");
      await remove(dbConnection, "development", "4");

      // Verify all were removed
      const developmentTasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(developmentTasks).toHaveLength(0);

      // Verify other category tasks remain
      const testingTasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "testing"));

      expect(testingTasks).toHaveLength(1);

      consoleSpy.mockRestore();
    });

    it("should handle partial failures in sequential removals", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Remove first task successfully
      await expect(
        remove(dbConnection, "development", "1"),
      ).resolves.not.toThrow();

      // Try to remove non-existent task
      await expect(
        remove(dbConnection, "development", "999"),
      ).rejects.toThrow();

      // Remove another existing task successfully
      await expect(
        remove(dbConnection, "development", "2"),
      ).resolves.not.toThrow();

      // Verify correct final state
      const developmentTasks = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.category, "development"));

      expect(developmentTasks).toHaveLength(1);
      expect(developmentTasks[0].id).toBe(4);

      consoleSpy.mockRestore();
    });
  });
});
