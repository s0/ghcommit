import { GitHub } from "@actions/github/lib/utils";

export type GitHubClient = InstanceType<typeof GitHub>;

import {
  CreateCommitOnBranchMutation,
  CreateCommitOnBranchMutationVariables,
} from "./generated/operations";

const CREATE_COMMIT_ON_BRANCH = /* GraphQL */ `
  mutation createCommitOnBranch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      ref {
        id
      }
    }
  }
`;

export const createCommitOnBranchQuery = async (
  o: GitHubClient,
  v: CreateCommitOnBranchMutationVariables,
): Promise<CreateCommitOnBranchMutation> => {
  return await o.graphql<CreateCommitOnBranchMutation>(
    CREATE_COMMIT_ON_BRANCH,
    v,
  );
};
