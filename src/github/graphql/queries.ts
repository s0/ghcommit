import { GitHub } from "@actions/github/lib/utils";

export type GitHubClient = InstanceType<typeof GitHub>;

import {
  CreateCommitOnBranchMutation,
  CreateCommitOnBranchMutationVariables,
  CreateRefMutation,
  CreateRefMutationVariables,
  GetRepositoryMetadataQuery,
  GetRepositoryMetadataQueryVariables,
} from "./generated/operations";

const GET_REPOSITORY_METADATA = /* GraphQL */ `
  query getRepositoryMetadata($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
    }
  }
`;

const CREATE_REF = /* GraphQL */ `
  mutation createRef($input: CreateRefInput!) {
    createRef(input: $input) {
      ref {
        id
      }
    }
  }
`;

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
): Promise<CreateCommitOnBranchMutation> =>
  o.graphql<CreateCommitOnBranchMutation>(CREATE_COMMIT_ON_BRANCH, v);

export const getRepositoryMetadata = async (
  o: GitHubClient,
  v: GetRepositoryMetadataQueryVariables,
): Promise<GetRepositoryMetadataQuery["repository"]> => {
  const result = await o.graphql<GetRepositoryMetadataQuery>(
    GET_REPOSITORY_METADATA,
    v,
  );
  return result.repository;
};

export const createRefMutation = async (
  o: GitHubClient,
  v: CreateRefMutationVariables,
): Promise<CreateRefMutation> =>
  await o.graphql<CreateRefMutation>(CREATE_REF, v);
