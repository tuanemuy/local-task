import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "./get";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("get command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data
    await dbConnection.db.insert(schema.tasks).values([
      {
        id: 1,
        customId: "task-1",
        category: "test-category",
        name: "Test Task 1",
        description: "Test Description 1",
        status: "wip",
        comment: "Test comment 1",
      },
      {
        id: 2,
        customId: "task-2",
        category: "test-category",
        name: "Test Task 2",
        description: "Test Description 2",
        status: "done",
        comment: "Test comment 2",
      },
      {
        id: 3,
        customId: "task-3",
        category: "other-category",
        name: "Other Task",
        description: "Other Description",
        status: "wip",
        comment: null,
      },
      {
        id: 4,
        customId: "123",
        category: "test-category",
        name: "Numeric CustomId",
        description: "Task with numeric customId",
        status: "wip",
        comment: null,
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("search by numeric ID", () => {
    it("should find task by valid numeric ID", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", "1"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "task-1"'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name": "Test Task 1"'),
      );

      consoleSpy.mockRestore();
    });

    it("should find task by valid numeric ID with leading zeros", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", "01"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "task-1"'),
      );

      consoleSpy.mockRestore();
    });

    it("should throw error for non-existent numeric ID", async () => {
      await expect(get(dbConnection, "test-category", "999")).rejects.toThrow(
        "Task not found: 999",
      );
    });

    it("should throw error for negative numeric ID", async () => {
      await expect(get(dbConnection, "test-category", "-1")).rejects.toThrow();
    });

    it("should handle zero ID", async () => {
      await expect(get(dbConnection, "test-category", "0")).rejects.toThrow(
        "Task not found: 0",
      );
    });
  });

  describe("search by customId", () => {
    it("should find task by valid customId", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", "task-1"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "task-1"'),
      );

      consoleSpy.mockRestore();
    });

    it("should find task by numeric customId", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", "123"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "123"'),
      );

      consoleSpy.mockRestore();
    });

    it("should throw error for non-existent customId", async () => {
      await expect(
        get(dbConnection, "test-category", "non-existent"),
      ).rejects.toThrow("Task not found: non-existent");
    });

    it("should handle special characters in customId", async () => {
      // Insert task with special characters
      await dbConnection.db.insert(schema.tasks).values({
        customId: "task-with-special-chars!@#$%",
        category: "test-category",
        name: "Special Task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", "task-with-special-chars!@#$%"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "task-with-special-chars!@#$%"'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("category filtering", () => {
    it("should not find task from different category", async () => {
      await expect(
        get(dbConnection, "wrong-category", "task-1"),
      ).rejects.toThrow("Task not found: task-1");
    });

    it("should find task in correct category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "other-category", "task-3"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"customId": "task-3"'),
      );

      consoleSpy.mockRestore();
    });

    it("should handle empty category name", async () => {
      await expect(get(dbConnection, "", "task-1")).rejects.toThrow(
        "Task not found: task-1",
      );
    });
  });

  describe("boundary cases", () => {
    it("should handle empty idOrCustomId", async () => {
      await expect(get(dbConnection, "test-category", "")).rejects.toThrow(
        "Task not found: ",
      );
    });

    it("should handle whitespace-only idOrCustomId", async () => {
      await expect(get(dbConnection, "test-category", "   ")).rejects.toThrow(
        "Task not found:    ",
      );
    });

    it("should handle very long customId", async () => {
      const longCustomId = "a".repeat(1000);

      // Insert task with long customId
      await dbConnection.db.insert(schema.tasks).values({
        customId: longCustomId,
        category: "test-category",
        name: "Long CustomId Task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", longCustomId),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`"customId": "${longCustomId}"`),
      );

      consoleSpy.mockRestore();
    });

    it("should handle unicode characters in customId", async () => {
      const unicodeCustomId = "タスク-🚀-中文";

      // Insert task with unicode customId
      await dbConnection.db.insert(schema.tasks).values({
        customId: unicodeCustomId,
        category: "test-category",
        name: "Unicode Task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        get(dbConnection, "test-category", unicodeCustomId),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`"customId": "${unicodeCustomId}"`),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle floating point numbers as ID", async () => {
      await expect(get(dbConnection, "test-category", "1.5")).rejects.toThrow(
        "Task not found: 1.5",
      );
    });

    it("should handle scientific notation as ID", async () => {
      await expect(get(dbConnection, "test-category", "1e2")).rejects.toThrow(
        "Task not found: 1e2",
      );
    });

    it("should handle hex numbers as customId", async () => {
      await expect(get(dbConnection, "test-category", "0xFF")).rejects.toThrow(
        "Task not found: 0xFF",
      );
    });

    it("should handle mixed alphanumeric ID", async () => {
      await expect(get(dbConnection, "test-category", "1a")).rejects.toThrow(
        "Task not found: 1a",
      );
    });

    it("should handle ID with leading/trailing whitespace", async () => {
      await expect(get(dbConnection, "test-category", " 1 ")).rejects.toThrow(
        "Task not found:  1 ",
      );
    });
  });

  describe("JSON output format", () => {
    it("should output valid JSON", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await get(dbConnection, "test-category", "task-1");

      const output = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("id");
      expect(parsed).toHaveProperty("customId");
      expect(parsed).toHaveProperty("category");
      expect(parsed).toHaveProperty("createdAt");
      expect(parsed).toHaveProperty("updatedAt");

      consoleSpy.mockRestore();
    });

    it("should include all task fields in output", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await get(dbConnection, "test-category", "task-1");

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toMatchObject({
        id: 1,
        customId: "task-1",
        category: "test-category",
        name: "Test Task 1",
        description: "Test Description 1",
        status: "wip",
        comment: "Test comment 1",
      });

      consoleSpy.mockRestore();
    });

    it("should handle null values in JSON output", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await get(dbConnection, "other-category", "task-3");

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.comment).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
