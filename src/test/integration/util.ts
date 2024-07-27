import {
  deleteRefMutation,
  getRepositoryMetadata,
  GitHubClient,
} from "../../github/graphql/queries.js";
import { REPO } from "./env.js";

export const deleteBranches = async (
  octokit: GitHubClient,
  branches: string[],
) =>
  Promise.all(
    branches.map(async (branch) => {
      console.debug(`Deleting branch ${branch}`);
      // Get Ref
      const ref = await getRepositoryMetadata(octokit, {
        owner: REPO.owner,
        name: REPO.repository,
        ref: `refs/heads/${branch}`,
      });

      const refId = ref?.ref?.id;

      if (!refId) {
        console.warn(`Branch ${branch} not found`);
        return;
      }

      await deleteRefMutation(octokit, {
        input: {
          refId,
        },
      });

      console.debug(`Deleted branch ${branch}`);
    }),
  );
