import { callAgent } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { Feature } from "../models/feature.js";

export interface TaskDecomposition {
  tasks: Array<{
    title: string;
    userStory: string;
    description: string;
    acceptanceCriteria: string[];
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

Each task MUST include:
1. A **userStory** in the format: "Como [rol], quiero [acción] para [beneficio]" — this provides business context so both AI agents and human developers understand the WHY.
2. A **description** with detailed technical instructions: what to implement, which patterns to follow, specific code changes needed.
3. **acceptanceCriteria**: an array of specific, testable criteria that define when this task is DONE. Write them as verifiable statements.

Task types: create_file, modify_file, create_test, modify_test, create_config, delete_file

You must respond with valid JSON only, no other text. Use this exact format:
{
  "tasks": [
    {
      "title": "Short task title",
      "userStory": "Como [rol], quiero [acción] para [beneficio]",
      "description": "Detailed technical description of what to do, including specific code changes, patterns to follow, and implementation details",
      "acceptanceCriteria": ["El endpoint retorna 200 con los datos esperados", "Se valida el input con Zod", "..."],
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
