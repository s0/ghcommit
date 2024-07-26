/**
 * This file includes tests that will be run in CI.
 */
import * as os from "os";
import * as path from "path";
import { promises as fs } from "fs";
import { getOctokit } from "@actions/github/lib/github";
import pino from "pino";
import { configDotenv } from "dotenv";

import { commitFilesFromDirectory } from "../local";

configDotenv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN must be set");
}

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const [owner, repository] = GITHUB_REPOSITORY?.split("/") || [];
if (!owner || !repository) {
  throw new Error("GITHUB_REPOSITORY must be set");
}

const HEAD_OID = process.env.HEAD_OID;
if (!HEAD_OID) {
  throw new Error("HEAD_OID must be set");
}

const log = pino({
  level: process.env.RUNNER_DEBUG === "1" ? "debug" : "info",
  transport: {
    target: "pino-pretty",
  },
});

(async () => {
  // Create test directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  await fs.writeFile(path.join(tmpDir, "foo.txt"), "Hello, world!");

  const octokit = getOctokit(GITHUB_TOKEN);

  // Create random test branch name
  const branch = `test-branch-${Math.floor(Math.random() * 100000).toString(16)}`;

  await commitFilesFromDirectory({
    octokit,
    owner,
    repository,
    branch,
    baseOid: HEAD_OID,
    message: {
      headline: "Test commit",
      body: "This is a test commit",
    },
    workingDirectory: tmpDir,
    fileChanges: {
      additions: ["foo.txt"],
    },
    log,
  });
})();
