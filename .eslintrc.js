/** @type {import("eslint").Linter.Config} */
const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "prettier"],
  plugins: ["jest"],
  parser: "@typescript-eslint/parser",
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    "jest/globals": true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
    "coverage/",
    "generated/",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
  rules: {
    'no-unused-vars': 'off',
  }
};
