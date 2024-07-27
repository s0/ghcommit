import {
  commitFilesFromBase64,
  CommitFilesFromBase64Args,
  CommitFilesResult,
} from "./core.js";

export type CommitFilesFromBuffersArgs = Omit<
  CommitFilesFromBase64Args,
  "fileChanges"
> & {
  fileChanges: {
    additions?: Array<{
      path: string;
      contents: Buffer;
    }>;
    deletions?: string[];
  };
};

export const commitFilesFromBuffers = async ({
  fileChanges,
  ...otherArgs
}: CommitFilesFromBuffersArgs): Promise<CommitFilesResult> => {
  return commitFilesFromBase64({
    ...otherArgs,
    fileChanges: {
      additions: fileChanges.additions?.map(({ path, contents }) => ({
        path,
        contents: contents.toString("base64"),
      })),
      deletions: fileChanges.deletions?.map((path) => ({ path })),
    },
  });
};
