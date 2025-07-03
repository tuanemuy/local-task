import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { status } from "./status";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("status command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert comprehensive test data across multiple categories and statuses
    await dbConnection.db.insert(schema.tasks).values([
      // Development category - mixed status
      {
        customId: "dev-001",
        category: "development",
        name: "Setup project",
        status: "done",
      },
      {
        customId: "dev-002",
        category: "development",
        name: "Implement API",
        status: "wip",
      },
      {
        customId: "dev-003",
        category: "development",
        name: "Add tests",
        status: "wip",
      },
      {
        customId: "dev-004",
        category: "development",
        name: "Documentation",
        status: "done",
      },
      // Testing category - only WIP
      {
        customId: "test-001",
        category: "testing",
        name: "Manual testing",
        status: "wip",
      },
      {
        customId: "test-002",
        category: "testing",
        name: "Integration tests",
        status: "wip",
      },
      {
        customId: "test-003",
        category: "testing",
        name: "Performance tests",
        status: "wip",
      },
      // Documentation category - only Done
      {
        customId: "doc-001",
        category: "documentation",
        name: "API docs",
        status: "done",
      },
      {
        customId: "doc-002",
        category: "documentation",
        name: "User guide",
        status: "done",
      },
      // Design category - single task
      {
        customId: "design-001",
        category: "design",
        name: "UI mockups",
        status: "wip",
      },
      // Unicode category name
      {
        customId: "unicode-001",
        category: "カテゴリー中文🚀",
        name: "Unicode test task",
        status: "done",
      },
      // Special characters category
      {
        customId: "special-001",
        category: "category-with-special!@#$%",
        name: "Special chars task",
        status: "wip",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("basic functionality", () => {
    it("should display status table with all categories", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      // Verify console.log was called multiple times (header, separator, data rows)
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(3);

      // Check that header is present
      const header = consoleSpy.mock.calls[0][0];
      expect(header).toContain("Category");
      expect(header).toContain("WIP");
      expect(header).toContain("Done");

      // Check that separator line exists
      const separator = consoleSpy.mock.calls[1][0];
      expect(separator).toMatch(/^-+\+-+\+-+$/);

      consoleSpy.mockRestore();
    });

    it("should show correct counts for each category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Development: 2 WIP, 2 Done
      expect(output).toContain("development");
      const devLine = output
        .split("\n")
        .find((line) => line.includes("development"));
      expect(devLine).toContain("2"); // WIP count
      expect(devLine).toContain("2"); // Done count

      // Testing: 3 WIP, 0 Done
      expect(output).toContain("testing");
      const testLine = output
        .split("\n")
        .find((line) => line.includes("testing"));
      expect(testLine).toContain("3"); // WIP count
      expect(testLine).toContain("0"); // Done count

      // Documentation: 0 WIP, 2 Done
      expect(output).toContain("documentation");
      const docLine = output
        .split("\n")
        .find((line) => line.includes("documentation"));
      expect(docLine).toContain("0"); // WIP count
      expect(docLine).toContain("2"); // Done count

      // Design: 1 WIP, 0 Done
      expect(output).toContain("design");
      const designLine = output
        .split("\n")
        .find((line) => line.includes("design"));
      expect(designLine).toContain("1"); // WIP count
      expect(designLine).toContain("0"); // Done count

      consoleSpy.mockRestore();
    });

    it("should include all categories in output", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      expect(output).toContain("development");
      expect(output).toContain("testing");
      expect(output).toContain("documentation");
      expect(output).toContain("design");
      expect(output).toContain("カテゴリー中文🚀");
      expect(output).toContain("category-with-special!@#$%");

      consoleSpy.mockRestore();
    });
  });

  describe("count accuracy", () => {
    it("should count WIP tasks correctly", async () => {
      // Clear existing data and insert specific test data
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values([
        { customId: "wip-1", category: "test", status: "wip" },
        { customId: "wip-2", category: "test", status: "wip" },
        { customId: "wip-3", category: "test", status: "wip" },
        { customId: "done-1", category: "test", status: "done" },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const testLine = output.split("\n").find((line) => line.includes("test"));

      expect(testLine).toContain("3"); // WIP count
      expect(testLine).toContain("1"); // Done count

      consoleSpy.mockRestore();
    });

    it("should count Done tasks correctly", async () => {
      // Clear existing data and insert specific test data
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values([
        { customId: "done-1", category: "test", status: "done" },
        { customId: "done-2", category: "test", status: "done" },
        { customId: "done-3", category: "test", status: "done" },
        { customId: "done-4", category: "test", status: "done" },
        { customId: "done-5", category: "test", status: "done" },
        { customId: "wip-1", category: "test", status: "wip" },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const testLine = output.split("\n").find((line) => line.includes("test"));

      expect(testLine).toContain("1"); // WIP count
      expect(testLine).toContain("5"); // Done count

      consoleSpy.mockRestore();
    });

    it("should handle categories with only WIP tasks", async () => {
      // Clear existing data and insert WIP-only data
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values([
        { customId: "wip-1", category: "wip-only", status: "wip" },
        { customId: "wip-2", category: "wip-only", status: "wip" },
        { customId: "wip-3", category: "wip-only", status: "wip" },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const wipOnlyLine = output
        .split("\n")
        .find((line) => line.includes("wip-only"));

      expect(wipOnlyLine).toContain("3"); // WIP count
      expect(wipOnlyLine).toContain("0"); // Done count

      consoleSpy.mockRestore();
    });

    it("should handle categories with only Done tasks", async () => {
      // Clear existing data and insert Done-only data
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values([
        { customId: "done-1", category: "done-only", status: "done" },
        { customId: "done-2", category: "done-only", status: "done" },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const doneOnlyLine = output
        .split("\n")
        .find((line) => line.includes("done-only"));

      expect(doneOnlyLine).toContain("0"); // WIP count
      expect(doneOnlyLine).toContain("2"); // Done count

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should display message for empty database", async () => {
      // Clear all data
      await dbConnection.db.delete(schema.tasks);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      expect(consoleSpy).toHaveBeenCalledWith("No tasks found in any category");
      expect(consoleSpy.mock.calls.length).toBe(1); // Only the no tasks message

      consoleSpy.mockRestore();
    });

    it("should handle single category with single task", async () => {
      // Clear existing data and insert single task
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db
        .insert(schema.tasks)
        .values([{ customId: "only-task", category: "single", status: "wip" }]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      expect(consoleSpy.mock.calls.length).toBe(3); // header, separator, 1 data row

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("single");
      expect(output).toContain("1"); // WIP count
      expect(output).toContain("0"); // Done count

      consoleSpy.mockRestore();
    });

    it("should handle very large numbers correctly", async () => {
      // Clear existing data and insert many tasks
      await dbConnection.db.delete(schema.tasks);

      const manyTasks = Array.from({ length: 999 }, (_, i) => ({
        customId: `bulk-wip-${i}`,
        category: "bulk-test",
        name: `Bulk WIP task ${i}`,
        status: "wip" as const,
      }));

      const manyDoneTasks = Array.from({ length: 1234 }, (_, i) => ({
        customId: `bulk-done-${i}`,
        category: "bulk-test",
        name: `Bulk Done task ${i}`,
        status: "done" as const,
      }));

      await dbConnection.db
        .insert(schema.tasks)
        .values([...manyTasks, ...manyDoneTasks]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const bulkLine = output
        .split("\n")
        .find((line) => line.includes("bulk-test"));

      expect(bulkLine).toContain("999"); // WIP count
      expect(bulkLine).toContain("1234"); // Done count

      consoleSpy.mockRestore();
    });
  });

  describe("special characters and unicode", () => {
    it("should display unicode category names correctly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      expect(output).toContain("カテゴリー中文🚀");

      consoleSpy.mockRestore();
    });

    it("should handle special characters in category names", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      expect(output).toContain("category-with-special!@#$%");

      consoleSpy.mockRestore();
    });

    it("should handle extremely long category names", async () => {
      const longCategory = "very-long-category-name-" + "a".repeat(500);

      // Clear existing data and insert task with long category
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db
        .insert(schema.tasks)
        .values([
          { customId: "long-cat-task", category: longCategory, status: "wip" },
        ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain(longCategory);

      consoleSpy.mockRestore();
    });

    it("should handle empty string category", async () => {
      // Clear existing data and insert task with empty category
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db
        .insert(schema.tasks)
        .values([{ customId: "empty-cat-task", category: "", status: "wip" }]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      // Should show empty category with proper counts
      const lines = output.split("\n");
      const dataLines = lines.slice(2); // Skip header and separator
      expect(
        dataLines.some((line) => line.includes("1") && line.includes("0")),
      ).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe("table formatting", () => {
    it("should maintain consistent table structure", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const calls = consoleSpy.mock.calls.map((call) => call[0]);
      const header = calls[0];
      const separator = calls[1];
      const dataRows = calls.slice(2);

      // All rows should have the same number of columns (pipe characters)
      const headerCols = (header.match(/\|/g) || []).length;
      const separatorCols = (separator.match(/\+/g) || []).length;

      expect(separatorCols).toBe(headerCols); // separator should have same number of + as header has |

      dataRows.forEach((row) => {
        const rowCols = (row.match(/\|/g) || []).length;
        expect(rowCols).toBe(headerCols);
      });

      consoleSpy.mockRestore();
    });

    it("should adjust column widths based on content", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const header = consoleSpy.mock.calls[0][0];
      const separator = consoleSpy.mock.calls[1][0];

      // Header and separator should have same structure
      const headerParts = header.split(" | ");
      const separatorParts = separator.split("-+-");

      expect(headerParts.length).toBe(separatorParts.length);
      expect(headerParts.length).toBe(3); // Category, WIP, Done

      // Category column should be wide enough for long category names
      const categoryColIndex = 0;
      const categoryWidth = headerParts[categoryColIndex].length;
      expect(categoryWidth).toBeGreaterThanOrEqual("Category".length);

      consoleSpy.mockRestore();
    });

    it("should use minimum column widths appropriately", async () => {
      // Test with minimal data to verify minimum widths
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values({
        customId: "a",
        category: "x",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const header = consoleSpy.mock.calls[0][0];

      // Check minimum widths are respected
      expect(header).toContain("Category"); // min 8
      expect(header).toContain("WIP"); // min 3
      expect(header).toContain("Done"); // min 4

      consoleSpy.mockRestore();
    });

    it("should align columns properly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const calls = consoleSpy.mock.calls.map((call) => call[0]);
      const lines = calls.slice(0, 3); // header, separator, first data row

      // Find positions of pipe characters - they should align
      const pipePositions = lines.map((line) => {
        const positions = [];
        for (let i = 0; i < line.length; i++) {
          if (line[i] === "|" || line[i] === "+") {
            positions.push(i);
          }
        }
        return positions;
      });

      // Header and data row pipe positions should match
      expect(pipePositions[0]).toEqual(pipePositions[2]);

      consoleSpy.mockRestore();
    });

    it("should pad content correctly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const dataRows = consoleSpy.mock.calls.slice(2).map((call) => call[0]);

      // Check that short content is padded and long content fits
      dataRows.forEach((row) => {
        // Each field should be properly separated by " | "
        expect(row).toMatch(/^.+ \| .+ \| .+$/);
      });

      consoleSpy.mockRestore();
    });
  });

  describe("large dataset handling", () => {
    it("should handle many categories efficiently", async () => {
      // Clear existing and insert many categories
      await dbConnection.db.delete(schema.tasks);

      const manyCategories = Array.from({ length: 50 }, (_, i) => [
        {
          customId: `cat-${i}-wip-1`,
          category: `category-${i.toString().padStart(2, "0")}`,
          status: "wip" as const,
        },
        {
          customId: `cat-${i}-wip-2`,
          category: `category-${i.toString().padStart(2, "0")}`,
          status: "wip" as const,
        },
        {
          customId: `cat-${i}-done-1`,
          category: `category-${i.toString().padStart(2, "0")}`,
          status: "done" as const,
        },
      ]).flat();

      await dbConnection.db.insert(schema.tasks).values(manyCategories);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const startTime = Date.now();
      await status(dbConnection);
      const endTime = Date.now();

      // Should complete reasonably quickly (within 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should output header, separator, and 50 data rows
      expect(consoleSpy.mock.calls.length).toBe(52);

      consoleSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Close the database to simulate an error
      dbConnection.sqlite.close();

      await expect(status(dbConnection)).rejects.toThrow();
    });
  });

  describe("SQL aggregation accuracy", () => {
    it("should correctly aggregate mixed categories and statuses", async () => {
      // Clear and insert specific test pattern
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values([
        // Category catA: 3 WIP, 1 Done
        { customId: "a-w1", category: "catA", status: "wip" },
        { customId: "a-w2", category: "catA", status: "wip" },
        { customId: "a-w3", category: "catA", status: "wip" },
        { customId: "a-d1", category: "catA", status: "done" },
        // Category catB: 0 WIP, 4 Done
        { customId: "b-d1", category: "catB", status: "done" },
        { customId: "b-d2", category: "catB", status: "done" },
        { customId: "b-d3", category: "catB", status: "done" },
        { customId: "b-d4", category: "catB", status: "done" },
        // Category catC: 2 WIP, 2 Done
        { customId: "c-w1", category: "catC", status: "wip" },
        { customId: "c-w2", category: "catC", status: "wip" },
        { customId: "c-d1", category: "catC", status: "done" },
        { customId: "c-d2", category: "catC", status: "done" },
      ]);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await status(dbConnection);

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      const lines = output.split("\n");
      const dataLines = lines.slice(2); // Skip header and separator

      // Verify Category catA: 3 WIP, 1 Done
      const lineA = dataLines.find((line) => line.includes("catA"));
      expect(lineA).toBeDefined();
      expect(lineA).toContain("3");
      expect(lineA).toContain("1");

      // Verify Category catB: 0 WIP, 4 Done
      const lineB = dataLines.find((line) => line.includes("catB"));
      expect(lineB).toBeDefined();
      expect(lineB).toContain("0");
      expect(lineB).toContain("4");

      // Verify Category catC: 2 WIP, 2 Done
      const lineC = dataLines.find((line) => line.includes("catC"));
      expect(lineC).toBeDefined();
      expect(lineC).toContain("2");
      expect(lineC).toContain("2");

      consoleSpy.mockRestore();
    });
  });
});
