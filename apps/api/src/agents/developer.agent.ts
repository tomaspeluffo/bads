import { callAgentWithTools } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { Octokit } from "@octokit/rest";
import * as githubService from "../services/github.service.js";
import type { Task } from "../models/task.js";
import type { Feature } from "../models/feature.js";
import type Anthropic from "@anthropic-ai/sdk";

export interface DeveloperResult {
  files: githubService.FileChange[];
  explanation: string;
}

const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file from the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or update a file. Returns confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to repo root" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files in a directory",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path relative to repo root" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_codebase",
    description: "Search for code patterns in the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

export async function runDeveloperAgent(opts: {
  initiativeId: string;
  task: Task;
  feature: Feature;
  branchName: string;
  targetRepo: string;
  previousTaskOutputs: Record<string, unknown>[];
  rejectionFeedback?: string;
  octokit?: Octokit;
}): Promise<DeveloperResult> {
  const pendingFiles: githubService.FileChange[] = [];

  const system = `You are an expert software developer. Your job is to implement a specific task by reading existing code and writing new or modified files.

Use the provided tools to:
1. Read existing files to understand the codebase
2. Write new or modified files to implement the task

Important guidelines:
- Follow existing code patterns and conventions
- Write clean, well-structured code
- Include appropriate error handling
- Do NOT add unnecessary comments or documentation

When you are done implementing, provide a brief explanation of what you did and why.`;

  const previousContext = opts.previousTaskOutputs.length > 0
    ? `\n\nPrevious tasks in this feature have produced:\n${opts.previousTaskOutputs.map((o) => JSON.stringify(o)).join("\n")}`
    : "";

  const rejectionContext = opts.rejectionFeedback
    ? `\n\n**IMPORTANT - Previous attempt was rejected with feedback:**\n${opts.rejectionFeedback}\n\nPlease address this feedback in your implementation.`
    : "";

  const userStoryContext = opts.task.user_story
    ? `\n**User Story:** ${opts.task.user_story}`
    : "";

  const taskAcceptanceCriteria = (opts.task.acceptance_criteria ?? []).length > 0
    ? `\n**Criteria of Done:**\n${(opts.task.acceptance_criteria ?? []).map((c) => `- [ ] ${c}`).join("\n")}`
    : "";

  const userMessage = `Implement this task:

**Feature:** ${opts.feature.title}
**Feature Description:** ${opts.feature.description}
${userStoryContext}
**Task:** ${opts.task.title}
**Task Description:** ${opts.task.description}
**Task Type:** ${opts.task.task_type}
**Target Files:** ${(opts.task.file_paths ?? []).join(", ") || "To be determined"}
${taskAcceptanceCriteria}${previousContext}${rejectionContext}`;

  const handleToolUse = async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    switch (name) {
      case "read_file": {
        const path = input.path as string;
        // Check pending files first (written in this session)
        const pending = pendingFiles.find((f) => f.path === path);
        if (pending) return pending.content;
        return githubService.getFileContent(opts.targetRepo, opts.branchName, path, opts.octokit);
      }
      case "write_file": {
        const path = input.path as string;
        const content = input.content as string;
        const existing = pendingFiles.findIndex((f) => f.path === path);
        const change: githubService.FileChange = {
          path,
          content,
          action: existing >= 0 ? "update" : "create",
        };
        if (existing >= 0) {
          pendingFiles[existing] = change;
        } else {
          pendingFiles.push(change);
        }
        return `File ${path} written successfully (${content.length} bytes)`;
      }
      case "list_directory": {
        const path = input.path as string;
        const files = await githubService.listDirectoryContents(
          opts.targetRepo,
          opts.branchName,
          path,
          opts.octokit,
        );
        return files.join("\n");
      }
      case "search_codebase": {
        const query = input.query as string;
        const results = await githubService.searchCode(opts.targetRepo, query, opts.octokit);
        return results
          .map((r) => `${r.path}:\n${r.matches.join("\n")}`)
          .join("\n\n");
      }
      default:
        return `Unknown tool: ${name}`;
    }
  };

  const result = await callAgentWithTools(
    {
      agent: "developer",
      initiativeId: opts.initiativeId,
      featureId: opts.feature.id,
      taskId: opts.task.id,
      model: MODELS.DEVELOPER,
      maxTokens: MAX_TOKENS.DEVELOPER,
      system,
      messages: [{ role: "user", content: userMessage }],
      tools,
    },
    handleToolUse,
  );

  return {
    files: pendingFiles,
    explanation: result.content,
  };
}
