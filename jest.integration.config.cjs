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
};
