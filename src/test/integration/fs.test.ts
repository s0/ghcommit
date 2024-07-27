/**
 * This file includes tests that will be run in CI.
 */
import * as os from "os";
import * as path from "path";
import { promises as fs } from "fs";
import { getOctokit } from "@actions/github/lib/github";
import pino from "pino";
import { configDotenv } from "dotenv";

import { commitFilesFromDirectory } from "../../fs";
import { randomBytes } from "crypto";
import {
  deleteRefMutation,
  getRepositoryMetadata,
} from "../../github/graphql/queries";

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

const log = pino({
  level: process.env.RUNNER_DEBUG === "1" ? "debug" : "info",
  transport: {
    target: "pino-pretty",
  },
});

const octokit = getOctokit(GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `test-${randomBytes(4).toString("hex")}`;

const TEST_BRANCHES = {
  COMMIT_FILE: `${TEST_BRANCH_PREFIX}-commit-file`,
} as const;

describe("fs", () => {
  describe("commitFilesFromDirectory", () => {
    it("should commit a file", async () => {
      // Create test directory
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
      await fs.writeFile(path.join(tmpDir, "foo.txt"), "Hello, world!");

      await commitFilesFromDirectory({
        octokit,
        owner,
        repository,
        branch: TEST_BRANCHES.COMMIT_FILE,
        baseBranch: "main",
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
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await Promise.all(
      Object.values(TEST_BRANCHES).map(async (branch) => {
        console.debug(`Deleting branch ${branch}`);
        // Get Ref
        const ref = await getRepositoryMetadata(octokit, {
          owner,
          name: repository,
          ref: `refs/heads/${branch}`,
        });

        const refId = ref?.ref?.id;

        if (!refId) {
          console.warn(`Branch ${branch} not found`);
          return;
        }

        await deleteRefMutation(octokit, {
          input: {
            refId,
          },
        });

        console.debug(`Deleted branch ${branch}`);
      }),
    );
  });
});
