import { getOctokit } from "@actions/github/lib/github.js";

import { ENV, REPO, ROOT_TEST_BRANCH_PREFIX, log } from "./env.js";
import { commitFilesFromBuffers } from "../../node.js";
import { deleteBranches } from "./util.js";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `${ROOT_TEST_BRANCH_PREFIX}-node`;

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
            base: {
              branch: "main",
            },
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

    it("can commit using tag as a base", async () => {
      const branch = `${TEST_BRANCH_PREFIX}-tag-base`;
      branches.push(branch);
      const contents = Buffer.alloc(1024, "Hello, world!");

      await commitFilesFromBuffers({
        octokit,
        ...REPO,
        branch,
        base: {
          tag: "v0.1.0",
        },
        message: {
          headline: "Test commit",
          body: "This is a test commit",
        },
        fileChanges: {
          additions: [
            {
              path: `foo.txt`,
              contents,
            },
          ],
        },
        log,
      });
    });

    it("can commit using commit as a base", async () => {
      const branch = `${TEST_BRANCH_PREFIX}-commit-base`;
      branches.push(branch);
      const contents = Buffer.alloc(1024, "Hello, world!");

      await commitFilesFromBuffers({
        octokit,
        ...REPO,
        branch,
        base: {
          commit: "fce2760017eab6d85388ed5cfdfac171559d80b3",
        },
        message: {
          headline: "Test commit",
          body: "This is a test commit",
        },
        fileChanges: {
          additions: [
            {
              path: `foo.txt`,
              contents,
            },
          ],
        },
        log,
      });
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await deleteBranches(octokit, branches);
  });
});
