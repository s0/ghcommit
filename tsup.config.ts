import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/core.ts", "src/fs.ts", "src/node.ts"],
  format: ["cjs", "esm"],
  dts: true,
});
