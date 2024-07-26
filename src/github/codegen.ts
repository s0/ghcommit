import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/github/graphql/schema.cjs",
  documents: ["src/github/graphql/queries.ts"],
  generates: {
    "src/github/graphql/generated/types.ts": {
      plugins: ["typescript"],
    },
    "src/github/graphql/generated/operations.ts": {
      plugins: ["typescript-operations"],
      preset: "import-types",
      presetConfig: {
        typesPath: "./types.js",
      },
    },
  },
};

export default config;
