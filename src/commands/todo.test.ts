import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { todo } from "./todo";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { Task } from "../db/schema";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("todo command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data with mixed statuses
    await dbConnection.db.insert(schema.tasks).values([
      {
        customId: "wip-001",
        category: "development",
        name: "Active task 1",
        description: "This task is in progress",
        status: "wip",
        comment: "Working on it",
      },
      {
        customId: "wip-002",
        category: "development",
        name: "Active task 2",
        description: "Another task in progress",
        status: "wip",
        comment: null,
      },
      {
        customId: "done-001",
        category: "development",
        name: "Completed task",
        description: "This task is finished",
        status: "done",
        comment: "Task completed successfully",
      },
      {
        customId: "wip-003",
        category: "testing",
        name: "Testing task",
        description: "Test task in progress",
        status: "wip",
        comment: "Testing in progress",
      },
      {
        customId: "done-002",
        category: "testing",
        name: "Completed test",
        description: "Test task is done",
        status: "done",
        comment: "All tests passed",
      },
      {
        customId: "wip-004",
        category: "documentation",
        name: "Documentation task",
        description: "Writing documentation",
        status: "wip",
        comment: "Documentation in progress",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("basic functionality", () => {
    it("should return only tasks with 'wip' status", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      expect(results.every((t: Task) => t.status === "wip")).toBe(true);
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["wip-001", "wip-002"]),
      );

      consoleSpy.mockRestore();
    });

    it("should filter by category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "testing");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("testing");
      expect(results[0].status).toBe("wip");
      expect(results[0].customId).toBe("wip-003");

      consoleSpy.mockRestore();
    });

    it("should not include 'done' tasks", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results.some((t: Task) => t.status === "done")).toBe(false);
      expect(results.some((t: Task) => t.customId === "done-001")).toBe(false);

      consoleSpy.mockRestore();
    });

    it("should include all task fields", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("customId");
      expect(results[0]).toHaveProperty("category");
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("description");
      expect(results[0]).toHaveProperty("status");
      expect(results[0]).toHaveProperty("comment");
      expect(results[0]).toHaveProperty("createdAt");
      expect(results[0]).toHaveProperty("updatedAt");

      consoleSpy.mockRestore();
    });
  });

  describe("category filtering", () => {
    it("should only return tasks from specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "documentation");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("documentation");
      expect(results[0].customId).toBe("wip-004");

      // Ensure no tasks from other categories
      expect(results.some((t: Task) => t.category !== "documentation")).toBe(
        false,
      );

      consoleSpy.mockRestore();
    });

    it("should return empty array for category with no wip tasks", async () => {
      // Add a category with only done tasks
      await dbConnection.db.insert(schema.tasks).values({
        customId: "done-only",
        category: "completed-category",
        name: "Completed task",
        status: "done",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "completed-category");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should return empty array for non-existent category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "non-existent-category");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should handle case-sensitive category names", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "Development"); // Capital D

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0); // No match for different case

      consoleSpy.mockRestore();
    });
  });

  describe("boundary cases", () => {
    it("should handle empty category string", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle whitespace-only category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "   ");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle category with special characters", async () => {
      // Insert task with special character category
      await dbConnection.db.insert(schema.tasks).values({
        customId: "special-wip",
        category: "special-category!@#$%",
        name: "Special category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "special-category!@#$%");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("special-wip");

      consoleSpy.mockRestore();
    });

    it("should handle unicode category names", async () => {
      // Insert task with unicode category
      await dbConnection.db.insert(schema.tasks).values({
        customId: "unicode-wip",
        category: "カテゴリー中文🚀",
        name: "Unicode category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "カテゴリー中文🚀");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("unicode-wip");

      consoleSpy.mockRestore();
    });
  });

  describe("data integrity", () => {
    it("should include tasks with null comment", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      const taskWithNullComment = results.find(
        (t: Task) => t.customId === "wip-002",
      );
      expect(taskWithNullComment).toBeDefined();
      expect(taskWithNullComment.comment).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should include tasks with null name and description", async () => {
      // Insert task with null fields
      await dbConnection.db.insert(schema.tasks).values({
        customId: "minimal-wip",
        category: "development",
        name: null,
        description: null,
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      const minimalTask = results.find(
        (t: Task) => t.customId === "minimal-wip",
      );
      expect(minimalTask).toBeDefined();
      expect(minimalTask.name).toBeNull();
      expect(minimalTask.description).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should preserve exact field values", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      const task1 = results.find((t: Task) => t.customId === "wip-001");
      expect(task1).toMatchObject({
        customId: "wip-001",
        category: "development",
        name: "Active task 1",
        description: "This task is in progress",
        status: "wip",
        comment: "Working on it",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("result ordering", () => {
    it("should return results in consistent order", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output1 = consoleSpy.mock.calls[0][0];
      const results1 = JSON.parse(output1);

      consoleSpy.mockClear();

      await todo(dbConnection, "development");

      const output2 = consoleSpy.mock.calls[0][0];
      const results2 = JSON.parse(output2);

      expect(results1).toEqual(results2);

      consoleSpy.mockRestore();
    });
  });

  describe("JSON output format", () => {
    it("should output valid JSON array", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should format JSON with proper indentation", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];

      // Check if JSON is pretty-printed
      expect(output).toContain("\n");
      expect(output).toContain("  "); // 2-space indentation

      consoleSpy.mockRestore();
    });

    it("should handle empty results as valid JSON", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "non-existent");

      const output = consoleSpy.mock.calls[0][0];

      expect(() => JSON.parse(output)).not.toThrow();
      const results = JSON.parse(output);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("large dataset handling", () => {
    it("should handle many wip tasks", async () => {
      // Insert many wip tasks
      const manyWipTasks = Array.from({ length: 50 }, (_, i) => ({
        customId: `wip-bulk-${i.toString().padStart(3, "0")}`,
        category: "bulk-wip",
        name: `WIP task ${i}`,
        description: `Description for WIP task ${i}`,
        status: "wip" as const,
        comment: i % 2 === 0 ? `Comment ${i}` : null,
      }));

      // Also insert some done tasks to ensure they're filtered out
      const doneTasks = Array.from({ length: 25 }, (_, i) => ({
        customId: `done-bulk-${i.toString().padStart(3, "0")}`,
        category: "bulk-wip",
        name: `Done task ${i}`,
        status: "done" as const,
      }));

      await dbConnection.db
        .insert(schema.tasks)
        .values([...manyWipTasks, ...doneTasks]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "bulk-wip");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(50); // Only the wip tasks
      expect(results.every((t: Task) => t.status === "wip")).toBe(true);
      expect(results.every((t: Task) => t.category === "bulk-wip")).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe("mixed status scenarios", () => {
    it("should handle category with only done tasks", async () => {
      // Insert only done tasks in a new category
      await dbConnection.db.insert(schema.tasks).values([
        {
          customId: "done-only-1",
          category: "completed-only",
          name: "First done task",
          status: "done",
        },
        {
          customId: "done-only-2",
          category: "completed-only",
          name: "Second done task",
          status: "done",
        },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "completed-only");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle category with only wip tasks", async () => {
      // Insert only wip tasks in a new category
      await dbConnection.db.insert(schema.tasks).values([
        {
          customId: "wip-only-1",
          category: "wip-only",
          name: "First wip task",
          status: "wip",
        },
        {
          customId: "wip-only-2",
          category: "wip-only",
          name: "Second wip task",
          status: "wip",
        },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await todo(dbConnection, "wip-only");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      expect(results.every((t: Task) => t.status === "wip")).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
