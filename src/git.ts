import { promises as fs } from "fs";
import git from "isomorphic-git";
import { CommitFilesFromBase64Args } from "./core";
import { commitFilesFromBuffers, CommitFilesFromBuffersArgs } from "./node";

export type CommitChangesFromRepoArgs = Omit<
  CommitFilesFromBase64Args,
  "fileChanges" | "base"
> & {
  /**
   * The root of the repository.
   *
   * @default process.cwd()
   */
  repoDirectory?: string;
};

export const commitChangesFromRepo = async ({
  repoDirectory = process.cwd(),
  log,
  ...otherArgs
}: CommitChangesFromRepoArgs) => {
  const currentBranch = await git.currentBranch({ fs, dir: repoDirectory });

  if (!currentBranch) {
    throw new Error("Could not determine current branch");
  }

  log?.error(`Determining changes files for branch: ${currentBranch}`);

  const gitLog = await git.log({
    fs,
    dir: repoDirectory,
    ref: currentBranch,
    depth: 1,
  });

  const oid = gitLog[0]?.oid;

  if (!oid) {
    throw new Error("Could not determine oid for current branch");
  }

  // Determine changed files
  const trees = [git.TREE({ ref: oid }), git.WORKDIR()];
  const additions: CommitFilesFromBuffersArgs["fileChanges"]["additions"] = [];
  const deletions: CommitFilesFromBuffersArgs["fileChanges"]["deletions"] = [];
  const fileChanges = {
    additions,
    deletions,
  };
  await git.walk({
    fs,
    dir: repoDirectory,
    trees,
    map: async (filepath, [commit, workdir]) => {
      const prevOid = await commit?.oid();
      const currentOid = await workdir?.oid();
      // Don't include files that haven't changed, and exist in both trees
      if (prevOid === currentOid && !commit === !workdir) {
        return null;
      }
      // Don't include ignored files
      if (
        await git.isIgnored({
          fs,
          dir: repoDirectory,
          filepath,
        })
      ) {
        return null;
      }
      // Iterate through anything that may be a directory in either the
      // current commit or the working directory
      if (
        (await commit?.type()) === "tree" ||
        (await workdir?.type()) === "tree"
      ) {
        // Iterate through these directories
        return true;
      }
      if (!workdir) {
        // File was deleted
        deletions.push(filepath);
        return null;
      } else {
        // File was added / updated
        const arr = await workdir.content();
        if (!arr) {
          throw new Error(`Could not determine content of file ${filepath}`);
        }
        additions.push({
          path: filepath,
          contents: Buffer.from(arr),
        });
      }
      return true;
    },
  });

  return commitFilesFromBuffers({
    ...otherArgs,
    fileChanges,
    base: {
      commit: oid,
    },
  });
};
