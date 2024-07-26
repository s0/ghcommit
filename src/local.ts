import { promises as fs } from "fs";
import * as path from "path";
import {
  CommitMessage,
  FileAddition,
  FileDeletion,
} from "./github/graphql/generated/types";
import {
  createCommitOnBranchQuery,
  createRefMutation,
  getRepositoryMetadata,
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
  owner: string;
  repository: string;
  branch: string;
  /**
   * The current commit that the target branch is at
   */
  baseBranch: string;
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
    owner,
    repository,
    branch,
    baseBranch,
    message,
    fileChanges,
    log,
  } = args;
  const repositoryNameWithOwner = `${owner}/${repository}`;
  const baseRef = `refs/heads/${baseBranch}`;

  const additions: FileAddition[] = await Promise.all(
    (fileChanges.additions || []).map(async (p) => {
      const fileContents = await fs.readFile(path.join(workingDirectory, p));
      const base64Contents = Buffer.from(fileContents).toString("base64");
      return {
        path: p,
        contents: base64Contents,
      };
    }),
  );

  const deletions: FileDeletion[] =
    fileChanges.deletions?.map((p) => ({
      path: p,
    })) ?? [];

  log?.debug(`Getting repo info ${repositoryNameWithOwner}`);
  const info = await getRepositoryMetadata(octokit, {
    owner: args.owner,
    name: args.repository,
    ref: baseRef,
  });
  log?.debug(`Repo info: ${JSON.stringify(info, null, 2)}`);

  if (!info) {
    throw new Error(`Repository ${repositoryNameWithOwner} not found`);
  }

  const oid = info.ref?.target?.oid;

  if (!info) {
    throw new Error(`Ref ${baseRef} not found`);
  }

  log?.debug(`Creating branch ${branch} from commit ${oid}}`);
  const refId = await createRefMutation(octokit, {
    input: {
      repositoryId: info.id,
      name: `refs/heads/${branch}`,
      oid,
    },
  });

  log?.debug(`Created branch with refId ${JSON.stringify(refId, null, 2)}`);

  const refIdStr = refId.createRef?.ref?.id;

  if (!refIdStr) {
    throw new Error(`Failed to create branch ${branch}`);
  }

  await log?.debug(`Creating commit on branch ${args.branch}`);
  const createCommitMutation: CreateCommitOnBranchMutationVariables = {
    input: {
      branch: {
        id: refIdStr,
      },
      expectedHeadOid: oid,
      message,
      fileChanges: {
        additions,
        deletions,
      },
    },
  };
  log?.debug(JSON.stringify(createCommitMutation, null, 2));

  const result = await createCommitOnBranchQuery(octokit, createCommitMutation);
  return result.createCommitOnBranch?.ref?.id ?? null;
};
