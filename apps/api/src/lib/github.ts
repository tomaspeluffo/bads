import { Octokit } from "@octokit/rest";
import { env } from "../config/env.js";

const globalOctokit = env.GITHUB_TOKEN
  ? new Octokit({ auth: env.GITHUB_TOKEN })
  : null;

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export function getOctokit(): Octokit {
  if (!globalOctokit) {
    throw new Error("GITHUB_TOKEN is not configured");
  }
  return globalOctokit;
}
