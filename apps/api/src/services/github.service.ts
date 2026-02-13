import type { Octokit } from "@octokit/rest";
import { getOctokit, createOctokit } from "../lib/github.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ service: "github" });

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

function resolveOctokit(octokitOrToken?: Octokit | string): Octokit {
  if (!octokitOrToken) return getOctokit();
  if (typeof octokitOrToken === "string") return createOctokit(octokitOrToken);
  return octokitOrToken;
}

export async function getFileTree(
  targetRepo: string,
  branch: string,
  octokitOrToken?: Octokit | string,
): Promise<string[]> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "1",
  });

  return data.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path!);
}

export async function getFileContent(
  targetRepo: string,
  branch: string,
  path: string,
  octokitOrToken?: Octokit | string,
): Promise<string> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if ("content" in data && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  throw new Error(`File ${path} is not a regular file`);
}

/**
 * Ensures the repo has at least one commit on the base branch.
 * Empty GitHub repos have no refs, so git operations fail.
 * Creates an initial commit with a README if the repo is empty.
 */
export async function ensureRepoInitialized(
  targetRepo: string,
  baseBranch: string,
  octokitOrToken?: Octokit | string,
): Promise<void> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  try {
    await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
    // Branch exists, repo is initialized
    return;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status !== 404 && status !== 409) throw err;
  }

  // Repo is empty — create initial commit
  log.info({ targetRepo, baseBranch }, "Repo is empty, creating initial commit");

  const { data: blob } = await octokit.git.createBlob({
    owner,
    repo,
    content: Buffer.from(`# ${repo}\n`).toString("base64"),
    encoding: "base64",
  });

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: [{ path: "README.md", mode: "100644", type: "blob", sha: blob.sha }],
  });

  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: "Initial commit",
    tree: tree.sha,
    parents: [],
  });

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${baseBranch}`,
    sha: commit.sha,
  });

  log.info({ targetRepo, baseBranch }, "Repo initialized with initial commit");
}

export async function createBranch(
  targetRepo: string,
  baseBranch: string,
  newBranch: string,
  octokitOrToken?: Octokit | string,
): Promise<void> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  // Get the SHA of the base branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });

  // Create new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: ref.object.sha,
  });

  log.info({ targetRepo, baseBranch, newBranch }, "Branch created");
}

export interface FileChange {
  path: string;
  content: string;
  action: "create" | "update" | "delete";
}

export async function commitFiles(
  targetRepo: string,
  branch: string,
  files: FileChange[],
  message: string,
  octokitOrToken?: Octokit | string,
): Promise<string> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  // Get current commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const currentSha = ref.object.sha;

  // Get the current tree
  const { data: currentCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentSha,
  });

  // Create blobs for each file
  const treeItems = await Promise.all(
    files
      .filter((f) => f.action !== "delete")
      .map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      }),
  );

  // Add deleted files
  for (const file of files.filter((f) => f.action === "delete")) {
    treeItems.push({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: null as unknown as string, // null SHA deletes the file
    });
  }

  // Create tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentCommit.tree.sha,
    tree: treeItems,
  });

  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [currentSha],
  });

  // Update branch ref
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });

  log.info({ targetRepo, branch, fileCount: files.length, commitSha: commit.sha }, "Files committed");
  return commit.sha;
}

export async function getBranchDiff(
  targetRepo: string,
  baseBranch: string,
  headBranch: string,
  octokitOrToken?: Octokit | string,
): Promise<string> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: baseBranch,
    head: headBranch,
    mediaType: { format: "diff" },
  });

  // The diff is returned as a string when requesting diff format
  return typeof data === "string" ? data : JSON.stringify(data);
}

export async function getChangedFiles(
  targetRepo: string,
  headBranch: string,
  baseBranch: string,
  octokitOrToken?: Octokit | string,
): Promise<Array<{ filename: string; content: string }>> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: baseBranch,
    head: headBranch,
  });

  const results: Array<{ filename: string; content: string }> = [];

  for (const file of data.files ?? []) {
    if (file.status === "removed") continue;
    try {
      const content = await getFileContent(targetRepo, headBranch, file.filename, octokit);
      results.push({ filename: file.filename, content });
    } catch {
      // File might be binary or too large
    }
  }

  return results;
}

export async function createPullRequest(
  targetRepo: string,
  headBranch: string,
  baseBranch: string,
  title: string,
  body: string,
  octokitOrToken?: Octokit | string,
): Promise<{ number: number; url: string }> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: headBranch,
    base: baseBranch,
  });

  log.info({ targetRepo, prNumber: data.number }, "PR created");
  return { number: data.number, url: data.html_url };
}

export async function mergePullRequest(
  targetRepo: string,
  prNumber: number,
  octokitOrToken?: Octokit | string,
): Promise<void> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: "squash",
  });

  log.info({ targetRepo, prNumber }, "PR merged");
}

export async function listDirectoryContents(
  targetRepo: string,
  branch: string,
  path: string,
  octokitOrToken?: Octokit | string,
): Promise<string[]> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if (!Array.isArray(data)) return [path];
  return data.map((item) => item.path);
}

export async function searchCode(
  targetRepo: string,
  query: string,
  octokitOrToken?: Octokit | string,
): Promise<Array<{ path: string; matches: string[] }>> {
  const octokit = resolveOctokit(octokitOrToken);
  const { owner, repo } = parseRepo(targetRepo);

  const { data } = await octokit.search.code({
    q: `${query} repo:${owner}/${repo}`,
    per_page: 10,
  });

  return data.items.map((item) => ({
    path: item.path,
    matches: (item.text_matches ?? []).map((m) => m.fragment ?? ""),
  }));
}

// --- User-specific functions ---

export async function listUserRepos(
  token: string,
): Promise<Array<{ full_name: string; private: boolean; default_branch: string }>> {
  const octokit = createOctokit(token);

  const repos: Array<{ full_name: string; private: boolean; default_branch: string }> = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const r of data) {
      repos.push({
        full_name: r.full_name,
        private: r.private,
        default_branch: r.default_branch,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function createRepo(
  name: string,
  isPrivate: boolean,
  token: string,
): Promise<{ full_name: string; default_branch: string }> {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    private: isPrivate,
    auto_init: true,
  });

  log.info({ repoName: data.full_name }, "Repo created");
  return { full_name: data.full_name, default_branch: data.default_branch };
}
