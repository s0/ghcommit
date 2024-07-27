import * as os from "os";
import * as path from "path";
import { promises as fs } from "fs";
import { getOctokit } from "@actions/github/lib/github";

import { commitFilesFromDirectory } from "../../fs";
import { randomBytes } from "crypto";
import { ENV, REPO, log } from "./env";
import { deleteBranches } from "./util";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `test-fs-${randomBytes(4).toString("hex")}`;

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
        ...REPO,
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

    await deleteBranches(octokit, Object.values(TEST_BRANCHES));
  });
});
