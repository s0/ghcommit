const { randomBytes } = require("crypto");
const path = require("path");
const os = require("os");

const ROOT_TEST_BRANCH_PREFIX = `test-${randomBytes(4).toString("hex")}`;
const ROOT_TEMP_DIRECTORY = path.join(os.tmpdir(), ROOT_TEST_BRANCH_PREFIX);

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  /**
   * Configure jest to be compatible with the node-js requirement
   * of having `.js` extension in the import statement.
   */
  moduleNameMapper: {
    "^(.+).js$": "$1",
  },
  testMatch: ["<rootDir>/src/test/integration/**/*.test.ts"],
  globals: {
    ROOT_TEST_BRANCH_PREFIX,
    ROOT_TEMP_DIRECTORY,
  },
  globalTeardown: "<rootDir>/src/test/integration/jest.globalTeardown.ts",
};
