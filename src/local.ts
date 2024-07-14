import { promises as fs } from "fs";
import * as path from "path";
import {
  CommitMessage,
  FileAddition,
  FileDeletion,
} from "./github/graphql/generated/types";
import {
  createCommitOnBranchQuery,
  GitHubClient,
} from "./github/graphql/queries";
import { Logger } from "./logging";
import { CreateCommitOnBranchMutationVariables } from "./github/graphql/generated/operations";

export const commitFilesFromDirectory = async (args: {
  octokit: GitHubClient;
  /**
   * The root of the github repository.
   */
  workingDirectory?: string;
  repositoryNameWithOwner: string;
  branch: string;
  /**
   * The current commit that the target branch is at
   */
  expectedHeadOid: string;
  /**
   * The commit message
   */
  message: CommitMessage;
  fileChanges: {
    /**
     * File paths (relative to the repository root)
     */
    additions?: string[];
    deletions?: string[];
  };
  log?: Logger;
}) => {
  const {
    octokit,
    workingDirectory = process.cwd(),
    repositoryNameWithOwner,
    branch,
    expectedHeadOid,
    message,
    fileChanges,
    log,
  } = args;

  const additions: FileAddition[] = await Promise.all(
    (fileChanges.additions || []).map(async (p) => {
      const fileContents = await fs.readFile(path.join(workingDirectory, p));
      const base64Contents = Buffer.from(fileContents).toString("base64");
      return {
        path: p,
        contents: base64Contents,
      };
    })
  );

  const deletions: FileDeletion[] =
    fileChanges.deletions?.map((p) => ({
      path: p,
    })) ?? [];

  const mutation: CreateCommitOnBranchMutationVariables = {
    input: {
      branch: {
        repositoryNameWithOwner,
        branchName: branch,
      },
      expectedHeadOid,
      message,
      fileChanges: {
        additions,
        deletions,
      },
    },
  };

  log?.info(`Creating commit on branch ${args.branch}`);
  log?.info(JSON.stringify(mutation, null, 2));

  const result = await createCommitOnBranchQuery(octokit, mutation);
  return result.createCommitOnBranch?.ref?.id ?? null;
};
