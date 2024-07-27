import type {
  CommitMessage,
  FileChanges,
} from "./github/graphql/generated/types";
import {
  createCommitOnBranchQuery,
  createRefMutation,
  getRepositoryMetadata,
  GitHubClient,
} from "./github/graphql/queries";
import type { CreateCommitOnBranchMutationVariables } from "./github/graphql/generated/operations";
import type { Logger } from "./logging";

export type CommitFilesResult = {
  refId: string | null;
};

export type CommitFilesFromBase64Args = {
  octokit: GitHubClient;
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
  fileChanges: FileChanges;
  log?: Logger;
};

export const commitFilesFromBase64 = async ({
  octokit,
  owner,
  repository,
  branch,
  baseBranch,
  message,
  fileChanges,
  log,
}: CommitFilesFromBase64Args): Promise<CommitFilesResult> => {
  const repositoryNameWithOwner = `${owner}/${repository}`;
  const baseRef = `refs/heads/${baseBranch}`;

  log?.debug(`Getting repo info ${repositoryNameWithOwner}`);
  const info = await getRepositoryMetadata(octokit, {
    owner,
    name: repository,
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

  await log?.debug(`Creating commit on branch ${branch}`);
  const createCommitMutation: CreateCommitOnBranchMutationVariables = {
    input: {
      branch: {
        id: refIdStr,
      },
      expectedHeadOid: oid,
      message,
      fileChanges,
    },
  };
  log?.debug(JSON.stringify(createCommitMutation, null, 2));

  const result = await createCommitOnBranchQuery(octokit, createCommitMutation);
  return {
    refId: result.createCommitOnBranch?.ref?.id ?? null,
  };
};
