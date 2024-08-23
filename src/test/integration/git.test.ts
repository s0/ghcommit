import fs from "fs";
import path from "path";
import {
  ENV,
  REPO,
  ROOT_TEMP_DIRECTORY,
  ROOT_TEST_BRANCH_PREFIX,
  log,
} from "./env";
import { exec } from "child_process";
import { getOctokit } from "@actions/github";
import { commitChangesFromRepo } from "../../git";
import { getRefTreeQuery } from "../../github/graphql/queries";
import { deleteBranches } from "./util";

const octokit = getOctokit(ENV.GITHUB_TOKEN);

const TEST_BRANCH_PREFIX = `${ROOT_TEST_BRANCH_PREFIX}-git`;

const expectBranchHasFile = async ({
  branch,
  path,
  oid,
}: {
  branch: string;
  path: string;
  oid: string | null;
}) => {
  if (oid === null) {
    expect(() =>
      getRefTreeQuery(octokit, {
        owner: REPO.owner,
        name: REPO.repository,
        ref: `refs/heads/${branch}`,
        path,
      }),
    ).rejects.toThrow("Could not resolve file for path");
    return;
  }
  const ref = (
    await getRefTreeQuery(octokit, {
      owner: REPO.owner,
      name: REPO.repository,
      ref: `refs/heads/${branch}`,
      path,
    })
  ).repository?.ref?.target;

  if (!ref) {
    throw new Error("Unexpected missing ref");
  }

  if ("tree" in ref) {
    expect(ref.file?.oid ?? null).toEqual(oid);
  } else {
    throw new Error("Expected ref to have a tree");
  }
};

describe("git", () => {
  const branches: string[] = [];

  // Set timeout to 1 minute
  jest.setTimeout(60 * 1000);

  describe("commitChangesFromRepo", () => {
    const testDir = path.join(ROOT_TEMP_DIRECTORY, "commitChangesFromRepo");

    it("should correctly commit all changes", async () => {
      const branch = `${TEST_BRANCH_PREFIX}-multiple-changes`;

      await fs.promises.mkdir(testDir, { recursive: true });
      const repoDirectory = path.join(testDir, "repo-1");

      // Clone the git repo locally usig the git cli and child-process
      await new Promise<void>((resolve, reject) => {
        const p = exec(
          `git clone ${process.cwd()} repo-1`,
          { cwd: testDir },
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
        p.stdout?.pipe(process.stdout);
        p.stderr?.pipe(process.stderr);
      });

      // Update an existing file
      await fs.promises.writeFile(
        path.join(repoDirectory, "LICENSE"),
        "This is a new license",
      );
      // Remove a file
      await fs.promises.rm(path.join(repoDirectory, "package.json"));
      // Remove a file nested in a directory
      await fs.promises.rm(path.join(repoDirectory, "src", "index.ts"));
      // Add a new file
      await fs.promises.writeFile(
        path.join(repoDirectory, "new-file.txt"),
        "This is a new file",
      );
      // Add a new file nested in a directory
      await fs.promises.mkdir(path.join(repoDirectory, "nested"), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(repoDirectory, "nested", "nested-file.txt"),
        "This is a nested file",
      );
      // Add files that should be ignored
      await fs.promises.writeFile(
        path.join(repoDirectory, ".env"),
        "This file should be ignored",
      );
      await fs.promises.mkdir(path.join(repoDirectory, "coverage", "foo"), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(repoDirectory, "coverage", "foo", "bar"),
        "This file should be ignored",
      );

      // Push the changes
      await commitChangesFromRepo({
        octokit,
        ...REPO,
        branch,
        message: {
          headline: "Test commit",
          body: "This is a test commit",
        },
        repoDirectory,
        log,
      });

      // Expect the deleted files to not exist
      await expectBranchHasFile({ branch, path: "package.json", oid: null });
      await expectBranchHasFile({ branch, path: "src/index.ts", oid: null });
      // Expect updated file to have new oid
      await expectBranchHasFile({
        branch,
        path: "LICENSE",
        oid: "8dd03bb8a1d83212f3667bd2eb8b92746120ab8f",
      });
      // Expect new files to have correct oid
      await expectBranchHasFile({
        branch,
        path: "new-file.txt",
        oid: "be5b944ff55ca7569cc2ae34c35b5bda8cd5d37e",
      });
      await expectBranchHasFile({
        branch,
        path: "nested/nested-file.txt",
        oid: "60eb5af9a0c03dc16dc6d0bd9a370c1aa4e095a3",
      });
      // Expect ignored files to not exist
      await expectBranchHasFile({ branch, path: ".env", oid: null });
      await expectBranchHasFile({
        branch,
        path: "coverage/foo/bar",
        oid: null,
      });
    });
  });

  afterAll(async () => {
    console.info("Cleaning up test branches");

    await deleteBranches(octokit, branches);
  });
});
