import { callAgent } from "./base-agent.js";
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
  const system = `Sos un desarrollador senior. Descomponés features en tasks atómicas. Cada task es un cambio independiente.

Cada task tiene:
- title: título corto
- description: qué hacer técnicamente (2-3 oraciones)
- taskType: create_file | modify_file | create_test | modify_test | create_config | delete_file
- filePaths: archivos afectados
- prompt: markdown para copiar a Claude Code (ver formato abajo)

El prompt es un markdown conciso que alguien puede pegar en Claude Code para implementar la task. Formato:

# {título de la task}

## Contexto
{1-2 oraciones sobre el feature y el proyecto}

## Qué hacer
{instrucciones concretas, paso a paso}

## Archivos
{lista de archivos a crear/modificar}

## Criterios de aceptación
{los que apliquen de la feature}

IMPORTANTE: El prompt debe ser CONCISO. No repetir información innecesaria. Máximo 30 líneas por prompt.

Respondé SOLO con JSON válido:
{"tasks":[{"title":"...","description":"...","taskType":"...","filePaths":["..."],"prompt":"..."}]}

Ordená por dependencia. Incluí tests después de implementación.`;

  const userStoryBlock = opts.feature.user_story
    ? `\nUser Story: ${opts.feature.user_story}`
    : "";

  const userMessage = `Descomponé este feature en tasks:

Feature: ${opts.feature.title}
Descripción: ${opts.feature.description}${userStoryBlock}
Criterios de aceptación:
${(opts.feature.acceptance_criteria ?? []).map((c) => `- ${c}`).join("\n") || "No especificados"}

File tree (primeros 150):
${opts.fileTree.slice(0, 150).join("\n")}${opts.fileTree.length > 150 ? `\n... +${opts.fileTree.length - 150} archivos más` : ""}`;

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

  const cleaned = result.content
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as TaskDecomposition;
}
