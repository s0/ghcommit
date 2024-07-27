import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/fs.ts"],
  format: ["cjs", "esm"],
  dts: true,
});
