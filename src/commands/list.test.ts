import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { list } from "./list";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { Task } from "../db/schema";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("list command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data across multiple categories
    await dbConnection.db.insert(schema.tasks).values([
      {
        customId: "dev-001",
        category: "development",
        name: "Setup project",
        description: "Initialize project structure",
        status: "done",
        comment: "Project setup complete",
      },
      {
        customId: "dev-002",
        category: "development",
        name: "Implement API",
        description: "Create REST API endpoints",
        status: "wip",
        comment: "In progress",
      },
      {
        customId: "dev-003",
        category: "development",
        name: "Add tests",
        description: "Write unit and integration tests",
        status: "wip",
        comment: null,
      },
      {
        customId: "test-001",
        category: "testing",
        name: "Manual testing",
        description: "Perform manual test scenarios",
        status: "wip",
        comment: "Testing in progress",
      },
      {
        customId: "test-002",
        category: "testing",
        name: "Automated tests",
        description: "Setup CI/CD pipeline",
        status: "done",
        comment: "Pipeline configured",
      },
      {
        customId: "doc-001",
        category: "documentation",
        name: "API documentation",
        description: "Document all API endpoints",
        status: "wip",
        comment: null,
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("basic functionality", () => {
    it("should list all tasks in specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(3);
      expect(results.every((t: Task) => t.category === "development")).toBe(
        true,
      );
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["dev-001", "dev-002", "dev-003"]),
      );

      consoleSpy.mockRestore();
    });

    it("should list all tasks in different category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "testing");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      expect(results.every((t: Task) => t.category === "testing")).toBe(true);
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["test-001", "test-002"]),
      );

      consoleSpy.mockRestore();
    });

    it("should return empty array for non-existent category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "non-existent");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should include all task fields in output", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

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
    it("should not include tasks from other categories", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "documentation");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("documentation");
      expect(results[0].customId).toBe("doc-001");

      // Ensure no tasks from other categories are included
      expect(results.some((t: Task) => t.category !== "documentation")).toBe(
        false,
      );

      consoleSpy.mockRestore();
    });

    it("should handle case-sensitive category names", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "Development"); // Capital D

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0); // No match for different case

      consoleSpy.mockRestore();
    });
  });

  describe("boundary cases", () => {
    it("should handle empty category string", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle whitespace-only category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "   ");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle category with special characters", async () => {
      // Insert task with special character category
      await dbConnection.db.insert(schema.tasks).values({
        customId: "special-001",
        category: "category-with-special!@#$%^&*()",
        name: "Special category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "category-with-special!@#$%^&*()");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("special-001");

      consoleSpy.mockRestore();
    });

    it("should handle unicode category names", async () => {
      // Insert task with unicode category
      await dbConnection.db.insert(schema.tasks).values({
        customId: "unicode-001",
        category: "カテゴリー中文🚀",
        name: "Unicode category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "カテゴリー中文🚀");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("unicode-001");

      consoleSpy.mockRestore();
    });

    it("should handle very long category names", async () => {
      const longCategory = "a".repeat(1000);

      // Insert task with long category name
      await dbConnection.db.insert(schema.tasks).values({
        customId: "long-cat-001",
        category: longCategory,
        name: "Long category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, longCategory);

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe(longCategory);

      consoleSpy.mockRestore();
    });
  });

  describe("result ordering", () => {
    it("should return results in consistent order", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output1 = consoleSpy.mock.calls[0][0];
      const results1 = JSON.parse(output1);

      consoleSpy.mockClear();

      await list(dbConnection, "development");

      const output2 = consoleSpy.mock.calls[0][0];
      const results2 = JSON.parse(output2);

      expect(results1).toEqual(results2);

      consoleSpy.mockRestore();
    });

    it("should maintain order across multiple calls", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Call multiple times and compare order
      const calls = [];
      for (let i = 0; i < 3; i++) {
        await list(dbConnection, "development");
        const output =
          consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0];
        calls.push(JSON.parse(output));
      }

      // All calls should return the same order
      expect(calls[0]).toEqual(calls[1]);
      expect(calls[1]).toEqual(calls[2]);

      consoleSpy.mockRestore();
    });
  });

  describe("data integrity", () => {
    it("should include tasks with null values", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      // Find task with null comment
      const taskWithNullComment = results.find(
        (t: Task) => t.customId === "dev-003",
      );
      expect(taskWithNullComment.comment).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should include all status types", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      const statuses = results.map((t: Task) => t.status);
      expect(statuses).toContain("wip");
      expect(statuses).toContain("done");

      consoleSpy.mockRestore();
    });

    it("should preserve exact field values", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      const setupTask = results.find((t: Task) => t.customId === "dev-001");
      expect(setupTask).toMatchObject({
        customId: "dev-001",
        category: "development",
        name: "Setup project",
        description: "Initialize project structure",
        status: "done",
        comment: "Project setup complete",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("JSON output format", () => {
    it("should output valid JSON array", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should format JSON with proper indentation", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "development");

      const output = consoleSpy.mock.calls[0][0];

      // Check if JSON is pretty-printed (contains line breaks and spaces)
      expect(output).toContain("\n");
      expect(output).toContain("  "); // 2-space indentation

      consoleSpy.mockRestore();
    });

    it("should handle empty results as valid JSON", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "empty-category");

      const output = consoleSpy.mock.calls[0][0];

      expect(() => JSON.parse(output)).not.toThrow();
      const results = JSON.parse(output);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("large dataset handling", () => {
    it("should handle large number of tasks", async () => {
      // Insert many tasks
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        customId: `bulk-${i.toString().padStart(3, "0")}`,
        category: "bulk-test",
        name: `Bulk task ${i}`,
        description: `Description for task ${i}`,
        status: i % 2 === 0 ? ("wip" as const) : ("done" as const),
        comment: i % 3 === 0 ? `Comment ${i}` : null,
      }));

      await dbConnection.db.insert(schema.tasks).values(manyTasks);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await list(dbConnection, "bulk-test");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(100);
      expect(results.every((t: Task) => t.category === "bulk-test")).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
