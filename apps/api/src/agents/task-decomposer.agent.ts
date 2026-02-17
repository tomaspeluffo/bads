import { callAgent, extractJSON } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { Feature } from "../models/feature.js";

export interface TaskDecomposition {
  tasks: Array<{
    title: string;
    description: string;
    taskType: string;
    filePaths: string[];
    prompt: string;
  }>;
}

export async function runTaskDecomposerAgent(opts: {
  initiativeId: string;
  feature: Feature;
  fileTree: string[];
}): Promise<TaskDecomposition> {
  const system = `Descomponés features en tasks atómicas. Cada task = 1 cambio independiente.

Cada task: title, description (2-3 oraciones), taskType (create_file|modify_file|create_test|modify_test|create_config|delete_file), filePaths, prompt (markdown conciso, máx 20 líneas).

Formato del prompt:
# {título}
## Contexto
{1-2 oraciones}
## Qué hacer
{pasos concretos}
## Archivos
{lista}

Respondé SOLO JSON: {"tasks":[{"title":"...","description":"...","taskType":"...","filePaths":["..."],"prompt":"..."}]}
Ordená por dependencia. Tests después de implementación.`;

  const userStoryBlock = opts.feature.user_story
    ? `\nUser Story: ${opts.feature.user_story}`
    : "";

  const userMessage = `Descomponé este feature en tasks:

Feature: ${opts.feature.title}
Descripción: ${opts.feature.description}${userStoryBlock}
Criterios de aceptación:
${(opts.feature.acceptance_criteria ?? []).map((c) => `- ${c}`).join("\n") || "No especificados"}

File tree:
${opts.fileTree.slice(0, 50).join("\n")}${opts.fileTree.length > 50 ? `\n... +${opts.fileTree.length - 50} más` : ""}`;

  const result = await callAgent({
    agent: "task_decomposer",
    initiativeId: opts.initiativeId,
    featureId: opts.feature.id,
    model: MODELS.TASK_DECOMPOSER,
    maxTokens: MAX_TOKENS.TASK_DECOMPOSER,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  if (result.stopReason === "max_tokens") {
    throw new Error("Task decomposer response was truncated (max_tokens reached). The feature may be too complex.");
  }

  return extractJSON<TaskDecomposition>(result.content);
}
