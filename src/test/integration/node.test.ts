import { getOctokit } from "@actions/github/lib/github.js";

import { ENV, REPO, ROOT_TEST_BRANCH_PREFIX, log } from "./env.js";
import { commitFilesFromBuffers } from "../../node.js";
import { deleteBranches } from "./util.js";
import {
  createRefMutation,
  getRepositoryMetadata,
} from "../../github/graphql/queries.js";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `${ROOT_TEST_BRANCH_PREFIX}-node`;

describe("node", () => {
  const branches: string[] = [];

  // Set timeout to 1 minute
  jest.setTimeout(60 * 1000);

  const contents = Buffer.alloc(1024, "Hello, world!");
  const BASIC_FILE_CONTENTS = {
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
  };

  let repositoryId: string;

  beforeAll(async () => {
    const response = await getRepositoryMetadata(octokit, {
      owner: REPO.owner,
      name: REPO.repository,
      baseRef: "HEAD",
      targetRef: "HEAD",
    });
    if (!response?.id) {
      throw new Error("Repository not found");
    }
    repositoryId = response.id;
  });

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

      await commitFilesFromBuffers({
        octokit,
        ...REPO,
        branch,
        base: {
          tag: "v0.1.0",
        },
        ...BASIC_FILE_CONTENTS,
      });
    });

    it("can commit using commit as a base", async () => {
      const branch = `${TEST_BRANCH_PREFIX}-commit-base`;
      branches.push(branch);

      await commitFilesFromBuffers({
        octokit,
        ...REPO,
        branch,
        base: {
          commit: "fce2760017eab6d85388ed5cfdfac171559d80b3",
        },
        ...BASIC_FILE_CONTENTS,
      });
    });

    describe("existing branches", () => {
      it("can commit to existing branch when force is true", async () => {
        const branch = `${TEST_BRANCH_PREFIX}-existing-branch-force`;
        branches.push(branch);

        // Create an exiting branch
        await createRefMutation(octokit, {
          input: {
            repositoryId,
            name: `refs/heads/${branch}`,
            oid: "31ded45f25a07726e02fd111d4c230718b49fa2a",
          },
        });

        await commitFilesFromBuffers({
          octokit,
          ...REPO,
          branch,
          base: {
            commit: "fce2760017eab6d85388ed5cfdfac171559d80b3",
          },
          ...BASIC_FILE_CONTENTS,
          force: true,
        });
      });

      it("cannot commit to existing branch when force is false", async () => {
        const branch = `${TEST_BRANCH_PREFIX}-existing-branch-no-force`;
        branches.push(branch);

        // Create an exiting branch
        await createRefMutation(octokit, {
          input: {
            repositoryId,
            name: `refs/heads/${branch}`,
            oid: "31ded45f25a07726e02fd111d4c230718b49fa2a",
          },
        });

        expect(() =>
          commitFilesFromBuffers({
            octokit,
            ...REPO,
            branch,
            base: {
              commit: "fce2760017eab6d85388ed5cfdfac171559d80b3",
            },
            ...BASIC_FILE_CONTENTS,
          }),
        ).rejects.toThrow(
          `Branch ${branch} exists already and does not match base`,
        );
      });

      it("can commit to existing branch when force is false and target matches base", async () => {
        const branch = `${TEST_BRANCH_PREFIX}-existing-branch-matching-base`;
        branches.push(branch);

        // Create an exiting branch
        await createRefMutation(octokit, {
          input: {
            repositoryId,
            name: `refs/heads/${branch}`,
            oid: "31ded45f25a07726e02fd111d4c230718b49fa2a",
          },
        });

        await commitFilesFromBuffers({
          octokit,
          ...REPO,
          branch,
          base: {
            commit: "31ded45f25a07726e02fd111d4c230718b49fa2a",
          },
          ...BASIC_FILE_CONTENTS,
        });
      });

      it("can commit to same branch as base", async () => {
        const branch = `${TEST_BRANCH_PREFIX}-same-branch-as-base`;
        branches.push(branch);

        // Create an exiting branch
        await createRefMutation(octokit, {
          input: {
            repositoryId,
            name: `refs/heads/${branch}`,
            oid: "31ded45f25a07726e02fd111d4c230718b49fa2a",
          },
        });

        await commitFilesFromBuffers({
          octokit,
          ...REPO,
          branch,
          base: {
            branch,
          },
          ...BASIC_FILE_CONTENTS,
        });
      });
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await deleteBranches(octokit, branches);
  });
});
