import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { init, initForce } from "./init";
import { getDbPath } from "../utils/db";

vi.mock("../utils/db");
vi.mock("../db/migrate");
vi.mock("node:fs");

const mockGetDbPath = vi.mocked(getDbPath);
const mockExistsSync = vi.mocked(existsSync);
const mockRunMigrations = vi.hoisted(() => vi.fn());

vi.mock("../db/migrate", () => ({
  runMigrations: mockRunMigrations,
}));

describe("init command", () => {
  const mockDbPath = "/test/tasks.db";

  beforeEach(() => {
    mockGetDbPath.mockReturnValue(mockDbPath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("init", () => {
    it("should initialize database when it does not exist", async () => {
      mockExistsSync.mockReturnValue(false);
      mockRunMigrations.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await init();

      expect(mockExistsSync).toHaveBeenCalledWith(mockDbPath);
      expect(mockRunMigrations).toHaveBeenCalledWith(mockDbPath);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Initializing local-task database at: ${mockDbPath}`,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "local-task initialized successfully!",
      );

      consoleSpy.mockRestore();
    });

    it("should not initialize database when it already exists", async () => {
      mockExistsSync.mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await init();

      expect(mockExistsSync).toHaveBeenCalledWith(mockDbPath);
      expect(mockRunMigrations).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Database already exists at: ${mockDbPath}`,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Use '--force' to reinitialize the database",
      );

      consoleSpy.mockRestore();
    });

    it("should throw error when migration fails", async () => {
      mockExistsSync.mockReturnValue(false);
      const error = new Error("Migration failed");
      mockRunMigrations.mockRejectedValue(error);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(init()).rejects.toThrow("Migration failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to initialize local-task:",
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("initForce", () => {
    it("should reinitialize database regardless of existence", async () => {
      mockRunMigrations.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await initForce();

      expect(mockRunMigrations).toHaveBeenCalledWith(mockDbPath);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Reinitializing local-task database at: ${mockDbPath}`,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "local-task reinitialized successfully!",
      );

      consoleSpy.mockRestore();
    });

    it("should throw error when migration fails", async () => {
      const error = new Error("Migration failed");
      mockRunMigrations.mockRejectedValue(error);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(initForce()).rejects.toThrow("Migration failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to reinitialize local-task:",
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
