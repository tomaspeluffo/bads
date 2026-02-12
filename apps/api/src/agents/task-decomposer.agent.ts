import { callAgent } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { Feature } from "../models/feature.js";

export interface TaskDecomposition {
  tasks: Array<{
    title: string;
    description: string;
    taskType: string;
    filePaths: string[];
  }>;
}

export async function runTaskDecomposerAgent(opts: {
  initiativeId: string;
  feature: Feature;
  fileTree: string[];
}): Promise<TaskDecomposition> {
  const system = `You are a senior developer breaking down a feature into atomic tasks. Each task should be a single, focused change that can be implemented independently.

Task types: create_file, modify_file, create_test, modify_test, create_config, delete_file

You must respond with valid JSON only, no other text. Use this exact format:
{
  "tasks": [
    {
      "title": "Short task title",
      "description": "Detailed description of what to do, including specific code changes",
      "taskType": "create_file|modify_file|create_test|etc",
      "filePaths": ["path/to/file.ts"]
    }
  ]
}

Order tasks by dependency - tasks that create files others depend on should come first.
Always include test tasks after implementation tasks.`;

  const userMessage = `Break down this feature into atomic tasks:

**Feature:** ${opts.feature.title}

**Description:** ${opts.feature.description}

**Acceptance Criteria:**
${(opts.feature.acceptance_criteria ?? []).map((c) => `- ${c}`).join("\n") || "None specified"}

**Existing file tree (relevant paths):**
${opts.fileTree.slice(0, 200).join("\n")}
${opts.fileTree.length > 200 ? `... and ${opts.fileTree.length - 200} more files` : ""}`;

  const result = await callAgent({
    agent: "task_decomposer",
    initiativeId: opts.initiativeId,
    featureId: opts.feature.id,
    model: MODELS.TASK_DECOMPOSER,
    maxTokens: MAX_TOKENS.TASK_DECOMPOSER,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  return JSON.parse(result.content) as TaskDecomposition;
}
