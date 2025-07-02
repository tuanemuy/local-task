import { defineConfig } from "tsdown";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineConfig([
  {
    entry: "./src/index.ts",
    platform: "neutral",
    dts: true,
    plugins: [
      {
        name: "copy-drizzle",
        buildEnd() {
          // Copy drizzle migrations to dist folder
          const sourceDrizzleDir = join(process.cwd(), "drizzle");
          const destDrizzleDir = join(process.cwd(), "dist", "drizzle");

          if (existsSync(sourceDrizzleDir)) {
            cpSync(sourceDrizzleDir, destDrizzleDir, { recursive: true });
            console.log("✓ Copied drizzle migrations to dist/drizzle");
          }
        },
      },
    ],
  },
]);
