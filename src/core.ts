import type {
  CommitMessage,
  FileChanges,
} from "./github/graphql/generated/types.js";
import {
  createCommitOnBranchQuery,
  createRefMutation,
  getRepositoryMetadata,
  GitHubClient,
} from "./github/graphql/queries.js";
import type {
  CreateCommitOnBranchMutationVariables,
  GetRepositoryMetadataQuery,
} from "./github/graphql/generated/operations.js";
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

export type CommitFilesFromBase64Args = {
  octokit: GitHubClient;
  owner: string;
  repository: string;
  branch: string;
  /**
   * The current branch, tag or commit that the new branch should be based on.
   */
  base: GitBase;
  /**
   * The commit message
   */
  message: CommitMessage;
  fileChanges: FileChanges;
  log?: Logger;
};

const getBaseRef = (base: GitBase): string => {
  if ("branch" in base) {
    return `refs/heads/${base.branch}`;
  } else if ("tag" in base) {
    return `refs/tags/${base.tag}`;
  } else {
    return "HEAD";
  }
};

const getOidFromRef = (
  base: GitBase,
  ref: (GetRepositoryMetadataQuery["repository"] & Record<never, never>)["ref"],
) => {
  if ("commit" in base) {
    return base.commit;
  }

  if (!ref?.target) {
    throw new Error(`Could not determine oid from ref: ${JSON.stringify(ref)}`);
  }

  if ("target" in ref.target) {
    return ref.target.target.oid;
  }

  return ref.target.oid;
};

export const commitFilesFromBase64 = async ({
  octokit,
  owner,
  repository,
  branch,
  base,
  message,
  fileChanges,
  log,
}: CommitFilesFromBase64Args): Promise<CommitFilesResult> => {
  const repositoryNameWithOwner = `${owner}/${repository}`;
  const baseRef = getBaseRef(base);

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

  if (!info.ref) {
    throw new Error(`Ref ${baseRef} not found`);
  }

  const repositoryId = info.id;
  /**
   * The commit oid to base the new commit on.
   *
   * Used both to create / update the new branch (if necessary),
   * and th ensure no changes have been made as we push the new commit.
   */
  const baseOid = getOidFromRef(base, info.ref);

  let refId: string;

  if ("branch" in base && base.branch === branch) {
    log?.debug(`Committing to the same branch as base: ${branch} (${baseOid})`);
    // Get existing branch refId
    refId = info.ref.id;
  } else {
    // Create branch as not committing to same branch
    // TODO: detect if branch already exists, and overwrite if so
    log?.debug(`Creating branch ${branch} from commit ${baseOid}}`);
    const refIdCreation = await createRefMutation(octokit, {
      input: {
        repositoryId,
        name: `refs/heads/${branch}`,
        oid: baseOid,
      },
    });

    log?.debug(
      `Created branch with refId ${JSON.stringify(refIdCreation, null, 2)}`,
    );

    const refIdStr = refIdCreation.createRef?.ref?.id;

    if (!refIdStr) {
      throw new Error(`Failed to create branch ${branch}`);
    }

    refId = refIdStr;
  }

  await log?.debug(`Creating commit on branch ${branch}`);
  const createCommitMutation: CreateCommitOnBranchMutationVariables = {
    input: {
      branch: {
        id: refId,
      },
      expectedHeadOid: baseOid,
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
