import { getOctokit } from "@actions/github";

import { ENV, REPO, ROOT_TEST_BRANCH_PREFIX, log } from "./env.js";
import { commitFilesFromBuffers } from "../../node.js";
import { deleteBranches } from "./util.js";
import {
  createRefMutation,
  getRefTreeQuery,
  getRepositoryMetadata,
} from "../../github/graphql/queries.js";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `${ROOT_TEST_BRANCH_PREFIX}-node`;

const TEST_TARGET_COMMIT = "fce2760017eab6d85388ed5cfdfac171559d80b3";
/**
 * For tests, important that this commit is not an ancestor of TEST_TARGET_COMMIT,
 * to ensure that non-fast-forward pushes are tested
 */
const TEST_TARGET_COMMIT_2 = "7ba8473f02849de3b5449b25fc83c5245d338d94";
const TEST_TARGET_TREE_2 = "95c9ea756f3686614dcdc1c42f7f654b684cdac2";

const BASIC_FILE_CHANGES_PATH = "foo.txt";
const BASIC_FILE_CHANGES_OID = "0e23339619d605319ec4b49a0ac9dd94598eff8e";
const BASIC_FILE_CONTENTS = {
  message: {
    headline: "Test commit",
    body: "This is a test commit",
  },
  fileChanges: {
    additions: [
      {
        path: BASIC_FILE_CHANGES_PATH,
        contents: Buffer.alloc(1024, "Hello, world!"),
      },
    ],
  },
  log,
};

const TEST_TARGET_TREE_WITH_BASIC_CHANGES =
  "a3431c9b42b71115c52bc6fbf9da3682cf0ed5e8";

describe("node", () => {
  const branches: string[] = [];

  // Set timeout to 1 minute
  jest.setTimeout(60 * 1000);

  let repositoryId: string;

  const expectBranchHasTree = async ({
    branch,
    treeOid,
    file,
  }: {
    branch: string;
    treeOid?: string;
    file?: {
      path: string;
      oid: string;
    };
  }) => {
    const ref = (
      await getRefTreeQuery(octokit, {
        owner: REPO.owner,
        name: REPO.repository,
        ref: `refs/heads/${branch}`,
        path: file?.path ?? "package.json",
      })
    ).repository?.ref?.target;

    if (!ref) {
      throw new Error("Unexpected missing ref");
    }

    if ("tree" in ref) {
      if (treeOid) {
        expect(ref.tree.oid).toEqual(treeOid);
      }
      if (file) {
        expect(ref.file?.oid).toEqual(file.oid);
      }
    } else {
      throw new Error("Expected ref to have a tree");
    }
  };

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
        "1KiB": {
          sizeBytes: 1024,
          treeOid: "547dfe4079b53c3b45a6717ac1ed6d98512f0a1c",
          fileOid: "0e23339619d605319ec4b49a0ac9dd94598eff8e",
        },
        "1MiB": {
          sizeBytes: 1024 * 1024,
          treeOid: "a6dca57388cf08de146bcc01a2113b218d6c2858",
          fileOid: "a1d7fed1b4a8de1b665dc4f604015b2d87ef978f",
        },
        "10MiB": {
          sizeBytes: 1024 * 1024 * 10,
          treeOid: "c4788256a2c1e3ea4267cff0502a656d992248ec",
          fileOid: "e36e74edbb6d3fc181ef584a50f8ee55585d27cc",
        },
      };

      for (const [sizeName, { sizeBytes, treeOid, fileOid }] of Object.entries(
        SIZES_BYTES,
      )) {
        it(`Can commit a ${sizeName}`, async () => {
          const branch = `${TEST_BRANCH_PREFIX}-${sizeName}`;
          branches.push(branch);
          const contents = Buffer.alloc(sizeBytes, "Hello, world!");

          await commitFilesFromBuffers({
            octokit,
            ...REPO,
            branch,
            base: {
              commit: TEST_TARGET_COMMIT,
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

          await expectBranchHasTree({
            branch,
            treeOid,
            file: {
              path: `${sizeName}.txt`,
              oid: fileOid,
            },
          });
        });
      }
    });

    it("can commit using branch as a base", async () => {
      const branch = `${TEST_BRANCH_PREFIX}-branch-base`;
      branches.push(branch);

      await commitFilesFromBuffers({
        octokit,
        ...REPO,
        branch,
        base: {
          branch: "main",
        },
        ...BASIC_FILE_CONTENTS,
      });

      // Don't test tree for this one as it will change over time / be unstable
      await expectBranchHasTree({
        branch,
        file: {
          path: BASIC_FILE_CHANGES_PATH,
          oid: BASIC_FILE_CHANGES_OID,
        },
      });
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

      // Don't test tree for this one as it will change over time / be unstable
      await expectBranchHasTree({
        branch,
        file: {
          path: BASIC_FILE_CHANGES_PATH,
          oid: BASIC_FILE_CHANGES_OID,
        },
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
          commit: TEST_TARGET_COMMIT,
        },
        ...BASIC_FILE_CONTENTS,
      });

      await expectBranchHasTree({
        branch,
        treeOid: TEST_TARGET_TREE_WITH_BASIC_CHANGES,
        file: {
          path: BASIC_FILE_CHANGES_PATH,
          oid: BASIC_FILE_CHANGES_OID,
        },
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
            oid: TEST_TARGET_COMMIT_2,
          },
        });

        await commitFilesFromBuffers({
          octokit,
          ...REPO,
          branch,
          base: {
            commit: TEST_TARGET_COMMIT,
          },
          ...BASIC_FILE_CONTENTS,
          force: true,
        });

        await expectBranchHasTree({
          branch,
          treeOid: TEST_TARGET_TREE_WITH_BASIC_CHANGES,
          file: {
            path: BASIC_FILE_CHANGES_PATH,
            oid: BASIC_FILE_CHANGES_OID,
          },
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
            oid: TEST_TARGET_COMMIT_2,
          },
        });

        expect(() =>
          commitFilesFromBuffers({
            octokit,
            ...REPO,
            branch,
            base: {
              commit: TEST_TARGET_COMMIT,
            },
            ...BASIC_FILE_CONTENTS,
          }),
        ).rejects.toThrow(
          `Branch ${branch} exists already and does not match base`,
        );

        await expectBranchHasTree({
          branch,
          treeOid: TEST_TARGET_TREE_2,
        });
      });

      it("can commit to existing branch when force is false and target matches base", async () => {
        const branch = `${TEST_BRANCH_PREFIX}-existing-branch-matching-base`;
        branches.push(branch);

        // Create an exiting branch
        await createRefMutation(octokit, {
          input: {
            repositoryId,
            name: `refs/heads/${branch}`,
            oid: TEST_TARGET_COMMIT,
          },
        });

        await commitFilesFromBuffers({
          octokit,
          ...REPO,
          branch,
          base: {
            commit: TEST_TARGET_COMMIT,
          },
          ...BASIC_FILE_CONTENTS,
        });

        await expectBranchHasTree({
          branch,
          treeOid: TEST_TARGET_TREE_WITH_BASIC_CHANGES,
          file: {
            path: BASIC_FILE_CHANGES_PATH,
            oid: BASIC_FILE_CHANGES_OID,
          },
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
            oid: TEST_TARGET_COMMIT,
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

        await expectBranchHasTree({
          branch,
          treeOid: TEST_TARGET_TREE_WITH_BASIC_CHANGES,
          file: {
            path: BASIC_FILE_CHANGES_PATH,
            oid: BASIC_FILE_CHANGES_OID,
          },
        });
      });
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await deleteBranches(octokit, branches);
  });
});
