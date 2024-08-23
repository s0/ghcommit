import type {
  CommitMessage,
  FileChanges,
} from "./github/graphql/generated/types.js";
import type { GitHubClient } from "./github/graphql/queries.js";

import type { Logger } from "./logging.js";

export type CommitFilesResult = {
  refId: string | null;
};

export type GitBase =
  | {
      branch: string;
    }
  | {
      tag: string;
    }
  | {
      commit: string;
    };

export interface CommitFilesBasedArgs {
  octokit: GitHubClient;
  owner: string;
  repository: string;
  branch: string;
  /**
   * Push the commit even if the branch exists and does not match what was
   * specified as the base.
   */
  force?: boolean;
  /**
   * The commit message
   */
  message: CommitMessage;
  log?: Logger;
}

export interface CommitFilesSharedArgsWithBase extends CommitFilesBasedArgs {
  /**
   * The current branch, tag or commit that the new branch should be based on.
   */
  base: GitBase;
}

export interface CommitFilesFromBase64Args
  extends CommitFilesSharedArgsWithBase {
  fileChanges: FileChanges;
}

export interface CommitFilesFromBuffersArgs
  extends CommitFilesSharedArgsWithBase {
  /**
   * The file changes, relative to the repository root, to make to the specified branch.
   */
  fileChanges: {
    additions?: Array<{
      path: string;
      contents: Buffer;
    }>;
    deletions?: string[];
  };
}

export interface CommitFilesFromDirectoryArgs
  extends CommitFilesSharedArgsWithBase {
  /**
   * The directory to consider the root of the repository when calculating
   * file paths
   */
  workingDirectory?: string;
  /**
   * The file paths, relative to {@link workingDirectory},
   * to add or delete from the branch on GitHub.
   */
  fileChanges: {
    /** File paths, relative to {@link workingDirectory}, to remove from the repo. */
    additions?: string[];
    /** File paths, relative to the repository root, to remove from the repo. */
    deletions?: string[];
  };
}

export interface CommitChangesFromRepoArgs extends CommitFilesBasedArgs {
  /**
   * The root of the repository.
   *
   * @default process.cwd()
   */
  repoDirectory?: string;
}
