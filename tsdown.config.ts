import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/postinstall.ts"],
    platform: "neutral",
    dts: true,
  },
]);
