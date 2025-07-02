import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { search } from "./search";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { Task } from "../db/schema";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("search command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data
    await dbConnection.db.insert(schema.tasks).values([
      {
        customId: "task-001",
        category: "development",
        name: "Implement authentication",
        description: "Add JWT authentication to the API",
        status: "wip",
        comment: "Working on JWT integration",
      },
      {
        customId: "task-002",
        category: "development",
        name: "Fix database connection",
        description: "Resolve connection pool issues",
        status: "done",
        comment: "Connection pool optimized",
      },
      {
        customId: "auth-login",
        category: "development",
        name: "Create login page",
        description: "Design and implement user login interface",
        status: "wip",
        comment: null,
      },
      {
        customId: "task-003",
        category: "testing",
        name: "Write unit tests",
        description: "Add comprehensive test coverage",
        status: "wip",
        comment: "Test framework setup complete",
      },
      {
        customId: "bug-fix-001",
        category: "development",
        name: "Memory leak in parser",
        description: "Fix memory leak issue in XML parser",
        status: "done",
        comment: "Fixed with proper cleanup",
      },
      {
        customId: "特殊-task",
        category: "development",
        name: "Unicode テスト",
        description: "Testing unicode 中文 support",
        status: "wip",
        comment: "Unicode test ñ",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("search by customId", () => {
    it("should find tasks with matching customId", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "task");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(3);
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["task-001", "task-002", "特殊-task"]),
      );

      consoleSpy.mockRestore();
    });

    it("should find tasks with exact customId match", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "auth-login");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("auth-login");

      consoleSpy.mockRestore();
    });

    it("should perform case-insensitive search on customId", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "TASK");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(3); // Should find tasks with "task" in customId
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["task-001", "task-002", "特殊-task"]),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("search by name", () => {
    it("should find tasks with matching name", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "login");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Create login page");

      consoleSpy.mockRestore();
    });

    it("should find tasks with partial name match", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "auth");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      const names = results.map((t: Task) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Implement authentication",
          "Create login page",
        ]),
      );

      consoleSpy.mockRestore();
    });

    it("should handle case-insensitive search on name", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "LOGIN");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1); // Should find "Create login page"

      consoleSpy.mockRestore();
    });
  });

  describe("search by description", () => {
    it("should find tasks with matching description", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "API");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe("Add JWT authentication to the API");

      consoleSpy.mockRestore();
    });

    it("should find tasks with partial description match", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "connection");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe("Resolve connection pool issues");

      consoleSpy.mockRestore();
    });
  });

  describe("combined search across fields", () => {
    it("should find tasks matching any field", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "fix");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      const names = results.map((t: Task) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Fix database connection",
          "Memory leak in parser",
        ]),
      );

      consoleSpy.mockRestore();
    });

    it("should search across multiple fields simultaneously", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "001"); // matches both customId and description

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(2);
      expect(results.map((t: Task) => t.customId)).toEqual(
        expect.arrayContaining(["task-001", "bug-fix-001"]),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("category filtering", () => {
    it("should only search within specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "testing", "test");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("testing");

      consoleSpy.mockRestore();
    });

    it("should return empty array for non-existent category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "non-existent", "task");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("boundary cases", () => {
    it("should handle empty search query", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      // Empty query should match all tasks in category
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((t: Task) => t.category === "development")).toBe(
        true,
      );

      consoleSpy.mockRestore();
    });

    it("should handle whitespace-only query", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "   ");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      // Whitespace query should literally search for whitespace characters, so should return 0 results
      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle very long search query", async () => {
      const longQuery = "a".repeat(1000);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", longQuery);

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle special characters in search query", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "特殊");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("特殊-task");

      consoleSpy.mockRestore();
    });

    it("should handle SQL injection patterns", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "'; DROP TABLE tasks; --");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should handle LIKE wildcards as literal characters", async () => {
      // Insert task with literal % and _ characters
      await dbConnection.db.insert(schema.tasks).values({
        customId: "wildcard_test%",
        category: "development",
        name: "Test with % and _ chars",
        description: "Contains 50% progress and file_name",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "%");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      // Should find the task with literal % character
      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("wildcard_test%");

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle null values in searchable fields", async () => {
      // Insert task with null name and description
      await dbConnection.db.insert(schema.tasks).values({
        customId: "null-fields",
        category: "development",
        name: null,
        description: null,
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "null-fields");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toHaveLength(1);
      expect(results[0].customId).toBe("null-fields");

      consoleSpy.mockRestore();
    });

    it("should return results in consistent order", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "task");

      const output1 = consoleSpy.mock.calls[0][0];
      const results1 = JSON.parse(output1);

      consoleSpy.mockClear();

      await search(dbConnection, "development", "task");

      const output2 = consoleSpy.mock.calls[0][0];
      const results2 = JSON.parse(output2);

      expect(results1).toEqual(results2);

      consoleSpy.mockRestore();
    });
  });

  describe("JSON output format", () => {
    it("should output valid JSON array", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "task");

      const output = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should include all task fields in results", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "task-001");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results[0]).toMatchObject({
        id: expect.any(Number),
        customId: "task-001",
        category: "development",
        name: "Implement authentication",
        description: "Add JWT authentication to the API",
        status: "wip",
        comment: "Working on JWT integration",
      });
      expect(results[0]).toHaveProperty("createdAt");
      expect(results[0]).toHaveProperty("updatedAt");

      consoleSpy.mockRestore();
    });

    it("should return empty array when no matches found", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await search(dbConnection, "development", "non-existent-query");

      const output = consoleSpy.mock.calls[0][0];
      const results = JSON.parse(output);

      expect(results).toEqual([]);

      consoleSpy.mockRestore();
    });
  });
});
