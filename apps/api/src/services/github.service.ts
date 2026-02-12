import { getOctokit } from "../lib/github.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ service: "github" });

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

export async function getFileTree(
  targetRepo: string,
  branch: string,
): Promise<string[]> {
  const octokit = getOctokit();
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
): Promise<string> {
  const octokit = getOctokit();
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

export async function createBranch(
  targetRepo: string,
  baseBranch: string,
  newBranch: string,
): Promise<void> {
  const octokit = getOctokit();
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
): Promise<string> {
  const octokit = getOctokit();
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
): Promise<string> {
  const octokit = getOctokit();
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
): Promise<Array<{ filename: string; content: string }>> {
  const octokit = getOctokit();
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
      const content = await getFileContent(targetRepo, headBranch, file.filename);
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
): Promise<{ number: number; url: string }> {
  const octokit = getOctokit();
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
): Promise<void> {
  const octokit = getOctokit();
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
): Promise<string[]> {
  const octokit = getOctokit();
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
): Promise<Array<{ path: string; matches: string[] }>> {
  const octokit = getOctokit();
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
