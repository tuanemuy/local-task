import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { show } from "./show";
import { getTestDb } from "../utils/db";
import { schema } from "../db";
import type { DatabaseConnection } from "../utils/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("show command", () => {
  let dbConnection: DatabaseConnection;

  beforeEach(async () => {
    dbConnection = getTestDb();
    const migrationsFolder = path.join(__dirname, "../db/../../drizzle");
    migrate(dbConnection.db, { migrationsFolder });

    // Insert test data with various field lengths
    await dbConnection.db.insert(schema.tasks).values([
      {
        id: 1,
        customId: "short",
        category: "development",
        name: "Short name",
        description: "Brief description",
        status: "wip",
        comment: "Quick comment",
      },
      {
        id: 2,
        customId: "very-long-custom-id-that-will-expand-column",
        category: "development",
        name: "This is a very long task name that should expand the name column significantly",
        description:
          "This is an extremely long description that contains a lot of detail about what this task is supposed to accomplish and why it matters",
        status: "done",
        comment:
          "This is a comprehensive comment explaining the completion status and any relevant details",
      },
      {
        id: 3,
        customId: "medium-id",
        category: "development",
        name: "Medium length name",
        description: "Moderate description with some detail",
        status: "wip",
        comment: null,
      },
      {
        id: 10,
        customId: "empty-fields",
        category: "development",
        name: null,
        description: null,
        status: "done",
        comment: null,
      },
      {
        id: 4,
        customId: "unicode-テスト",
        category: "testing",
        name: "Unicode test 中文",
        description: "Testing unicode support データベース",
        status: "wip",
        comment: "Unicode comment 🚀",
      },
      {
        id: 5,
        customId: "special-chars",
        category: "testing",
        name: "Special !@#$%^&*()",
        description: "Description with symbols []{}|;':\",./<>?",
        status: "done",
        comment: "Comment with tabs\tand\nnewlines",
      },
    ]);
  });

  afterEach(() => {
    dbConnection.sqlite.close();
  });

  describe("basic functionality", () => {
    it("should display table with tasks from specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

      // Verify console.log was called multiple times (header, separator, data rows)
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(3);

      // Check that header is present
      const header = consoleSpy.mock.calls[0][0];
      expect(header).toContain("ID");
      expect(header).toContain("CustomID");
      expect(header).toContain("Name");
      expect(header).toContain("Description");
      expect(header).toContain("Status");
      expect(header).toContain("Comment");

      // Check that separator line exists
      const separator = consoleSpy.mock.calls[1][0];
      expect(separator).toMatch(/^-+\+-+\+-+\+-+\+-+\+-+$/);

      // Check that data rows contain task information
      const dataRows = consoleSpy.mock.calls.slice(2);
      expect(dataRows.some((call) => call[0].includes("short"))).toBe(true);
      expect(
        dataRows.some((call) => call[0].includes("very-long-custom-id")),
      ).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should only show tasks from specified category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "testing");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Should contain testing category tasks
      expect(output).toContain("unicode-テスト");
      expect(output).toContain("special-chars");

      // Should not contain development category tasks
      expect(output).not.toContain("short");
      expect(output).not.toContain("very-long-custom-id");

      consoleSpy.mockRestore();
    });

    it("should display message for empty category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "non-existent");

      expect(consoleSpy).toHaveBeenCalledWith(
        "No tasks found in category 'non-existent'",
      );
      expect(consoleSpy.mock.calls.length).toBe(1); // Only the no tasks message

      consoleSpy.mockRestore();
    });

    it("should handle all field types correctly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Check that all expected data appears
      expect(output).toContain("1"); // ID
      expect(output).toContain("short"); // customId
      expect(output).toContain("wip"); // status
      expect(output).toContain("done"); // status

      consoleSpy.mockRestore();
    });
  });

  describe("column width calculation", () => {
    it("should adjust column widths based on content", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

      const header = consoleSpy.mock.calls[0][0];
      const separator = consoleSpy.mock.calls[1][0];

      // Header and separator should have same structure
      const headerParts = header.split(" | ");
      const separatorParts = separator.split("-+-");

      expect(headerParts.length).toBe(separatorParts.length);

      // CustomID column should be wide enough for the long custom ID
      expect(header).toContain("CustomID");
      const customIdIndex = headerParts.findIndex((part: string) =>
        part.includes("CustomID"),
      );
      const customIdWidth = headerParts[customIdIndex].length;
      expect(customIdWidth).toBeGreaterThanOrEqual(
        "very-long-custom-id-that-will-expand-column".length,
      );

      consoleSpy.mockRestore();
    });

    it("should use minimum column widths for short content", async () => {
      // Test with minimal data to verify minimum widths
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values({
        id: 1,
        customId: "a",
        category: "test",
        name: "b",
        description: "c",
        status: "wip",
        comment: "d",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "test");

      const header = consoleSpy.mock.calls[0][0];

      // Check minimum widths are respected
      expect(header).toContain("ID"); // min 2
      expect(header).toContain("CustomID"); // min 8
      expect(header).toContain("Name"); // min 4
      expect(header).toContain("Description"); // min 11
      expect(header).toContain("Status"); // min 6
      expect(header).toContain("Comment"); // min 7

      consoleSpy.mockRestore();
    });

    it("should handle extreme column width cases", async () => {
      // Test with very long content
      const veryLongString = "a".repeat(200);

      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values({
        id: 1,
        customId: veryLongString,
        category: "test",
        name: veryLongString,
        description: veryLongString,
        status: "wip",
        comment: veryLongString,
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "test");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Should handle very long content without error
      expect(output).toContain(veryLongString);

      consoleSpy.mockRestore();
    });
  });

  describe("null and empty value handling", () => {
    it("should display empty strings for null values", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Find the row with null values (empty-fields task)
      const lines = output.split("\n");
      const emptyFieldsLine = lines.find((line) =>
        line.includes("empty-fields"),
      );

      expect(emptyFieldsLine).toBeDefined();
      // Should have empty spaces where null values are
      expect(emptyFieldsLine).toMatch(/empty-fields.*\|\s*\|\s*\|/); // empty name and description

      consoleSpy.mockRestore();
    });

    it("should handle mixed null and non-null values", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Should contain both null and non-null values properly formatted
      expect(output).toContain("medium-id"); // has comment null
      expect(output).toContain("Short name"); // has all fields

      consoleSpy.mockRestore();
    });
  });

  describe("special characters and unicode", () => {
    it("should display unicode characters correctly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "testing");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      expect(output).toContain("unicode-テスト");
      expect(output).toContain("Unicode test 中文");
      expect(output).toContain("データベース");
      expect(output).toContain("🚀");

      consoleSpy.mockRestore();
    });

    it("should handle special characters in table format", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "testing");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      expect(output).toContain("!@#$%^&*()");
      expect(output).toContain("[]{}|;':\",./<>?");

      consoleSpy.mockRestore();
    });

    it("should handle newlines and tabs in content", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "testing");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

      // Newlines and tabs should be preserved as-is in the output
      expect(output).toContain("tabs\tand\nnewlines");

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle category with only one task", async () => {
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values({
        id: 1,
        customId: "only-task",
        category: "single",
        name: "Only task",
        description: "Single task in category",
        status: "wip",
        comment: "Alone",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "single");

      expect(consoleSpy.mock.calls.length).toBe(3); // header, separator, 1 data row

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("only-task");

      consoleSpy.mockRestore();
    });

    it("should handle very large ID numbers", async () => {
      await dbConnection.db.delete(schema.tasks);
      await dbConnection.db.insert(schema.tasks).values({
        id: 999999999,
        customId: "big-id-task",
        category: "test",
        name: "Big ID task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "test");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("999999999");

      consoleSpy.mockRestore();
    });

    it("should handle empty string category", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "");

      expect(consoleSpy).toHaveBeenCalledWith("No tasks found in category ''");

      consoleSpy.mockRestore();
    });

    it("should handle category with special characters", async () => {
      await dbConnection.db.insert(schema.tasks).values({
        customId: "special-cat",
        category: "special-category!@#",
        name: "Special category task",
        status: "wip",
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "special-category!@#");

      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("special-cat");

      consoleSpy.mockRestore();
    });
  });

  describe("table formatting", () => {
    it("should maintain consistent table structure", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

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

    it("should align columns properly", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await show(dbConnection, "development");

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

      await show(dbConnection, "development");

      const dataRows = consoleSpy.mock.calls.slice(2).map((call) => call[0]);

      // Check that short content is padded and long content fits
      dataRows.forEach((row) => {
        // Each field should be properly separated by " | "
        expect(row).toMatch(/^.+ \| .+ \| .+ \| .+ \| .+ \| .+$/);
      });

      consoleSpy.mockRestore();
    });
  });

  describe("large dataset handling", () => {
    it("should handle many tasks efficiently", async () => {
      // Insert many tasks
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        id: i + 100, // Start from 100 to avoid conflicts
        customId: `bulk-task-${i.toString().padStart(3, "0")}`,
        category: "bulk-test",
        name: `Bulk task ${i}`,
        description: `Description for task ${i}`,
        status: i % 2 === 0 ? ("wip" as const) : ("done" as const),
        comment: i % 3 === 0 ? `Comment ${i}` : null,
      }));

      await dbConnection.db.insert(schema.tasks).values(manyTasks);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const startTime = Date.now();
      await show(dbConnection, "bulk-test");
      const endTime = Date.now();

      // Should complete reasonably quickly (within 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should output header, separator, and 100 data rows
      expect(consoleSpy.mock.calls.length).toBe(102);

      consoleSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Close the database to simulate an error
      dbConnection.sqlite.close();

      await expect(show(dbConnection, "development")).rejects.toThrow();
    });
  });
});
