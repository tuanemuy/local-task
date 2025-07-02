import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, and } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { done } from "./done";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("done command", () => {
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
        name: "Task to complete",
        description: "This task needs to be marked as done",
        status: "wip",
        comment: "Initial comment",
      },
      {
        id: 2,
        customId: "task-002",
        category: "development",
        name: "Another task",
        description: "Another task to test",
        status: "wip",
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
        customId: "already-done-task",
        category: "development",
        name: "Already completed",
        description: "This task is already done",
        status: "done",
        comment: "Previously completed",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("successful operations", () => {
    it("should mark task as done with new comment", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", "Task completed successfully"),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe("Task completed successfully");

      expect(consoleSpy).toHaveBeenCalledWith("Task 1 marked as done");
      consoleSpy.mockRestore();
    });

    it("should mark task as done without comment", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "2"),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 2), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBeNull();

      expect(consoleSpy).toHaveBeenCalledWith("Task 2 marked as done");
      consoleSpy.mockRestore();
    });

    it("should mark task as done with empty comment", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", ""),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBeNull(); // Empty string should become null

      consoleSpy.mockRestore();
    });

    it("should update already done task", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "4", "Updated completion comment"),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 4), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe("Updated completion comment");

      consoleSpy.mockRestore();
    });

    it("should handle very long comments", async () => {
      const longComment = "a".repeat(1000);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", longComment),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe(longComment);

      consoleSpy.mockRestore();
    });

    it("should handle unicode comments", async () => {
      const unicodeComment = "タスク完了 ✅ 中文评论 🎉";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", unicodeComment),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe(unicodeComment);

      consoleSpy.mockRestore();
    });
  });

  describe("category filtering", () => {
    it("should only update task in specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "testing", "3", "Testing complete"),
      ).resolves.not.toThrow();

      // Verify correct task was updated
      const testingTask = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 3), eq(schema.tasks.category, "testing")),
        )
        .then((rows) => rows[0]);

      expect(testingTask.status).toBe("done");
      expect(testingTask.comment).toBe("Testing complete");

      // Verify tasks in other categories were not affected
      const devTask = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(devTask.status).toBe("wip"); // Should remain unchanged

      consoleSpy.mockRestore();
    });

    it("should fail when task exists but in wrong category", async () => {
      await expect(
        done(dbConnection, "wrong-category", "1", "Test"),
      ).rejects.toThrow("Task with id 1 not found");
    });
  });

  describe("error cases", () => {
    it("should throw error for non-existent task ID", async () => {
      await expect(
        done(dbConnection, "development", "999", "Test"),
      ).rejects.toThrow("Task with id 999 not found");
    });

    it("should throw error for invalid ID format", async () => {
      await expect(
        done(dbConnection, "development", "abc", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for empty ID", async () => {
      await expect(
        done(dbConnection, "development", "", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for whitespace-only ID", async () => {
      await expect(
        done(dbConnection, "development", "   ", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for negative ID", async () => {
      await expect(
        done(dbConnection, "development", "-1", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for decimal ID", async () => {
      await expect(
        done(dbConnection, "development", "1.5", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for ID with leading zeros followed by non-numeric", async () => {
      await expect(
        done(dbConnection, "development", "01a", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for mixed alphanumeric ID", async () => {
      await expect(
        done(dbConnection, "development", "1a2", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should throw error for very large ID", async () => {
      const largeId = "9".repeat(20); // 20 digits
      await expect(
        done(dbConnection, "development", largeId, "Test"),
      ).rejects.toThrow(`Task with id ${largeId} not found`);
    });
  });

  describe("boundary cases", () => {
    it("should handle zero ID", async () => {
      await expect(
        done(dbConnection, "development", "0", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should handle ID with leading zeros", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "001", "Test with leading zeros"),
      ).resolves.not.toThrow();

      // Verify the task was updated (leading zeros should be ignored)
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe("Test with leading zeros");

      consoleSpy.mockRestore();
    });

    it("should handle maximum safe integer ID", async () => {
      const maxSafeId = Number.MAX_SAFE_INTEGER.toString();
      await expect(
        done(dbConnection, "development", maxSafeId, "Test"),
      ).rejects.toThrow(`Task with id ${maxSafeId} not found`);
    });

    it("should handle comments with special characters", async () => {
      const specialComment =
        "Special chars: !@#$%^&*()[]{}|;':\",./<>?`~+=_-\\";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", specialComment),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.comment).toBe(specialComment);

      consoleSpy.mockRestore();
    });

    it("should handle comments with newlines and tabs", async () => {
      const multilineComment = "Line 1\nLine 2\tTabbed\rCarriage return";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", multilineComment),
      ).resolves.not.toThrow();

      // Verify the task was updated
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.comment).toBe(multilineComment);

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle scientific notation ID", async () => {
      await expect(
        done(dbConnection, "development", "1e2", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should handle hexadecimal ID", async () => {
      await expect(
        done(dbConnection, "development", "0xFF", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should handle ID with plus sign", async () => {
      await expect(
        done(dbConnection, "development", "+1", "Test"),
      ).rejects.toThrow("Invalid task ID");
    });

    it("should handle undefined comment", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        done(dbConnection, "development", "1", undefined),
      ).resolves.not.toThrow();

      // Verify comment is null when undefined is passed
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.comment).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("concurrency and data integrity", () => {
    it("should handle updating the same task multiple times", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Update the same task multiple times
      await done(dbConnection, "development", "1", "First update");
      await done(dbConnection, "development", "1", "Second update");
      await done(dbConnection, "development", "1", "Final update");

      // Verify the final state
      const task = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(task.status).toBe("done");
      expect(task.comment).toBe("Final update");

      consoleSpy.mockRestore();
    });

    it("should not affect other tasks when updating one", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Get initial state of other tasks
      const otherTasksBefore = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.category, "development"), eq(schema.tasks.id, 2)),
        );

      await done(dbConnection, "development", "1", "Update first task");

      // Verify other tasks remain unchanged
      const otherTasksAfter = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.category, "development"), eq(schema.tasks.id, 2)),
        );

      expect(otherTasksBefore).toEqual(otherTasksAfter);

      consoleSpy.mockRestore();
    });
  });

  describe("timestamp handling", () => {
    it("should update updatedAt timestamp", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Get initial timestamp
      const taskBefore = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await done(dbConnection, "development", "1", "Updated task");

      // Get updated timestamp
      const taskAfter = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(new Date(taskAfter.updatedAt).getTime()).toBeGreaterThan(
        new Date(taskBefore.updatedAt).getTime(),
      );

      consoleSpy.mockRestore();
    });

    it("should not change createdAt timestamp", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Get initial timestamp
      const taskBefore = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      await done(dbConnection, "development", "1", "Updated task");

      // Get updated task
      const taskAfter = await dbConnection.db
        .select()
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.id, 1), eq(schema.tasks.category, "development")),
        )
        .then((rows) => rows[0]);

      expect(taskAfter.createdAt).toEqual(taskBefore.createdAt);

      consoleSpy.mockRestore();
    });
  });
});
