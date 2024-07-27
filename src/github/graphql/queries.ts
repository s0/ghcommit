export type GitHubClient = {
  graphql: <T>(query: string, variables: any) => Promise<T>;
};

import type {
  CreateCommitOnBranchMutation,
  CreateCommitOnBranchMutationVariables,
  CreateRefMutation,
  CreateRefMutationVariables,
  DeleteRefMutation,
  DeleteRefMutationVariables,
  GetRepositoryMetadataQuery,
  GetRepositoryMetadataQueryVariables,
} from "./generated/operations.js";

const GET_REPOSITORY_METADATA = /* GraphQL */ `
  query getRepositoryMetadata($owner: String!, $name: String!, $ref: String!) {
    repository(owner: $owner, name: $name) {
      id
      ref(qualifiedName: $ref) {
        id
        target {
          oid
          ... on Tag {
            target {
              oid
            }
          }
        }
      }
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

const DELETE_REF = /* GraphQL */ `
  mutation deleteRef($input: DeleteRefInput!) {
    deleteRef(input: $input) {
      clientMutationId
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

export const deleteRefMutation = async (
  o: GitHubClient,
  v: DeleteRefMutationVariables,
): Promise<DeleteRefMutation> =>
  await o.graphql<DeleteRefMutation>(DELETE_REF, v);

export const createCommitOnBranchQuery = async (
  o: GitHubClient,
  v: CreateCommitOnBranchMutationVariables,
): Promise<CreateCommitOnBranchMutation> =>
  o.graphql<CreateCommitOnBranchMutation>(CREATE_COMMIT_ON_BRANCH, v);
