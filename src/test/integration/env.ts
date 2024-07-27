import pino from "pino";
import { configDotenv } from "dotenv";

configDotenv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN must be set");
}

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const [owner, repository] = GITHUB_REPOSITORY?.split("/") || [];
if (!owner || !repository) {
  throw new Error("GITHUB_REPOSITORY must be set");
}

export const ENV = {
  GITHUB_TOKEN,
};

export const REPO = { owner, repository };

export const log = pino({
  level: process.env.RUNNER_DEBUG === "1" ? "debug" : "info",
  transport: {
    target: "pino-pretty",
  },
});
