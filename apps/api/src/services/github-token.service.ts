import type { Octokit } from "@octokit/rest";
import { createOctokit, getOctokit } from "../lib/github.js";
import { query } from "../lib/db.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ service: "github-token" });

export async function getGithubTokenForUser(userId: string): Promise<string | null> {
  const result = await query<{ github_access_token: string | null }>(
    "SELECT github_access_token FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.github_access_token ?? null;
}

export async function getOctokitForInitiative(initiativeId: string): Promise<Octokit> {
  const result = await query<{ github_access_token: string | null }>(
    `SELECT u.github_access_token
     FROM initiatives i
     JOIN users u ON u.id = i.started_by
     WHERE i.id = $1`,
    [initiativeId],
  );

  const token = result.rows[0]?.github_access_token;

  if (token) {
    log.debug({ initiativeId }, "Using user GitHub token for initiative");
    return createOctokit(token);
  }

  log.debug({ initiativeId }, "No user token found, falling back to global token");
  return getOctokit();
}
