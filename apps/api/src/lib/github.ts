import { Octokit } from "@octokit/rest";
import { env } from "../config/env.js";

export const octokit = env.GITHUB_TOKEN
  ? new Octokit({ auth: env.GITHUB_TOKEN })
  : null;

export function getOctokit(): Octokit {
  if (!octokit) {
    throw new Error("GITHUB_TOKEN is not configured");
  }
  return octokit;
}
