import { promises as fs } from "fs";
import * as path from "path";
import type { FileAddition } from "./github/graphql/generated/types";
import { CommitFilesFromBase64Args, CommitFilesResult } from "./core";
import { commitFilesFromBuffers } from "./node";

export type CommitFilesFromDirectoryArgs = Omit<
  CommitFilesFromBase64Args,
  "fileChanges"
> & {
  /**
   * The directory to consider the root of the repository when calculating
   * file paths
   */
  workingDirectory?: string;
  fileChanges: {
    additions?: string[];
    deletions?: string[];
  };
};

export const commitFilesFromDirectory = async ({
  workingDirectory = process.cwd(),
  fileChanges,
  ...otherArgs
}: CommitFilesFromDirectoryArgs): Promise<CommitFilesResult> => {
  const additions: FileAddition[] = await Promise.all(
    (fileChanges.additions || []).map(async (p) => {
      return {
        path: p,
        contents: await fs.readFile(path.join(workingDirectory, p)),
      };
    }),
  );

  return commitFilesFromBuffers({
    ...otherArgs,
    fileChanges: {
      additions,
      deletions: fileChanges.deletions,
    },
  });
};
