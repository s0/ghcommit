import { getOctokit } from "@actions/github/lib/github";

import { randomBytes } from "crypto";
import { ENV, REPO, log } from "./env";
import { commitFilesFromBuffers } from "../../node";
import { deleteBranches } from "./util";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `test-node-${randomBytes(4).toString("hex")}`;

describe("node", () => {
  const branches: string[] = [];

  // Set timeout to 1 minute
  jest.setTimeout(60 * 1000);

  describe("commitFilesFromBuffers", () => {
    describe("can commit single file of various sizes", () => {
      const SIZES_BYTES = {
        "1KiB": 1024,
        "1MiB": 1024 * 1024,
        "10MiB": 1024 * 1024 * 10,
      };

      for (const [sizeName, sizeBytes] of Object.entries(SIZES_BYTES)) {
        it(`Can commit a ${sizeName}`, async () => {
          const branch = `${TEST_BRANCH_PREFIX}-${sizeName}`;
          branches.push(branch);
          const contents = Buffer.alloc(sizeBytes, "Hello, world!");

          await commitFilesFromBuffers({
            octokit,
            ...REPO,
            branch,
            baseBranch: "main",
            message: {
              headline: "Test commit",
              body: "This is a test commit",
            },
            fileChanges: {
              additions: [
                {
                  path: `${sizeName}.txt`,
                  contents,
                },
              ],
            },
            log,
          });
        });
      }
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await deleteBranches(octokit, branches);
  });
});
