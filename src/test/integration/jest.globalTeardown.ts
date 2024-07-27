import { promises as fs } from "fs";
import { Config } from "jest";

module.exports = async (_: unknown, projectConfig: Config) => {
  const directory = projectConfig.globals?.ROOT_TEMP_DIRECTORY;
  if (!(typeof directory == "string")) {
    throw new Error("ROOT_TEMP_DIRECTORY must be set");
  }
  console.log(`Deleting directory: ${directory}`);

  await fs.rm(directory, { recursive: true });
};
