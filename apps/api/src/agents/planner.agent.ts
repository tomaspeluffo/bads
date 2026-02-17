import { callAgent } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import * as memoryService from "../services/memory.service.js";
import type { NotionPageContent } from "../services/notion.service.js";

// --- Response types ---

export interface PlannerQuestion {
  category: string;
  question: string;
  why: string;
}

export interface PlannerNeedsInfo {
  status: "needs_info";
  summary: string;
  questions: PlannerQuestion[];
}

export interface PlannerReady {
  status: "ready";
  summary: string;
  features: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    userStory: string;
    developerContext?: string;
    estimatedComplexity: "low" | "medium" | "high";
  }>;
}

export type PlannerResult = PlannerNeedsInfo | PlannerReady;

// Keep legacy type for backwards compatibility with handler
export type PlannerReadyResult = PlannerReady;

// --- Agent ---

export async function runPlannerAgent(opts: {
  initiativeId: string;
  notionContent: NotionPageContent;
  additionalContext?: string;
}): Promise<PlannerResult> {
  // Get relevant patterns from memory
  const patterns = await memoryService.getRelevantPatterns("", ["planning"]).catch(() => []);
  const patternsContext = patterns.length > 0
    ? `\n\nPatrones relevantes de iniciativas anteriores:\n${patterns.map((p) => `- ${p.title}: ${p.content}`).join("\n")}`
    : "";

  const system = `Sos un tech lead. Recibís pitches y creás planes de implementación. Respondé siempre en español.

## Reglas

1. Si falta info crítica (stack, arquitectura, integraciones, flujo de usuario), devolvé "needs_info" con preguntas específicas (máximo 5 preguntas, solo lo que realmente bloquea).
2. Si el pitch tiene suficiente info, creá el plan directo.
3. Preferí crear el plan antes que pedir más info. Solo preguntá si algo realmente bloquea.
4. Cada feature = 1 PR, autocontenido, ordenado por dependencia.
5. El primer feature siempre es scaffold/setup del proyecto.
6. Sé conciso en descriptions y acceptance criteria.

## Formato JSON (sin markdown fences)

Si falta info:
{"status":"needs_info","summary":"...","questions":[{"category":"...","question":"...","why":"..."}]}

Si está completo:
{"status":"ready","summary":"...","features":[{"title":"...","description":"...","acceptanceCriteria":["..."],"userStory":"Como X quiero Y para Z","developerContext":"...","estimatedComplexity":"low|medium|high"}]}${patternsContext}`;

  // Include attached file contents if present
  const attachments = (opts.notionContent as unknown as Record<string, unknown>).attachments as Array<{ filename: string; text: string }> | undefined;
  const attachmentsBlock = attachments && attachments.length > 0
    ? `\n\n**Documentos adjuntos:**\n${attachments.map((a) => `--- ${a.filename} ---\n${a.text}`).join("\n\n")}`
    : "";

  const additionalBlock = opts.additionalContext
    ? `\n\n**Contexto adicional (respuestas a preguntas anteriores):**\n${opts.additionalContext}`
    : "";

  const userMessage = `Analizá este pitch y creá un plan (o pedí info faltante):

**Título:** ${opts.notionContent.title}
**Problema:** ${opts.notionContent.problem}
**Solución:** ${opts.notionContent.solutionSketch}
**No-Gos:** ${opts.notionContent.noGos.join(", ") || "No especificados"}
**Riesgos:** ${opts.notionContent.risks.join(", ") || "No especificados"}
**KPIs:** ${opts.notionContent.successCriteria || "No especificados"}
**Stack:** ${opts.notionContent.techStack || "No especificado"}
**Notas:** ${opts.notionContent.additionalNotes || "No especificadas"}
**Responsable:** ${opts.notionContent.responsable || "No especificado"}
**Soporte:** ${opts.notionContent.soporte || "No especificado"}${attachmentsBlock}${additionalBlock}`;

  const result = await callAgent({
    agent: "planner",
    initiativeId: opts.initiativeId,
    model: MODELS.PLANNER,
    maxTokens: MAX_TOKENS.PLANNER,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  if (result.stopReason === "max_tokens") {
    throw new Error("La respuesta del planificador fue truncada (max_tokens). El pitch puede ser demasiado largo o complejo.");
  }

  // Strip markdown fences (```json ... ```) that the model sometimes adds
  const cleaned = result.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as PlannerResult;
}
