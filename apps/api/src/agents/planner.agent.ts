import { callAgent, extractJSON } from "./base-agent.js";
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

  const system = `Sos un tech lead senior. Recibís pitches y creás planes de implementación. Respondé siempre en español.

## Tu rol

Tomás todas las decisiones técnicas vos: stack, arquitectura, base de datos, frameworks, patrones de diseño, estructura de carpetas, etc. No preguntás sobre eso.

Solo preguntás lo que únicamente el cliente puede responder: lógica de negocio específica, flujos de usuario concretos, integraciones con sistemas externos que no están documentados, reglas de negocio ambiguas, o requisitos que afectan directamente qué se construye (no cómo).

## Reglas

1. Tomá todas las decisiones técnicas vos. Nunca preguntés sobre stack, arquitectura o herramientas.
2. Solo preguntá si falta información de negocio que vos no podés inferir ni decidir (máximo 5 preguntas, solo lo que realmente bloquea entender QUÉ construir).
3. Si podés inferir o decidir algo razonablemente, hacelo y documentalo en developerContext.
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

  // Only include fields that have actual content to reduce token usage
  const fields: string[] = [
    `**Título:** ${opts.notionContent.title}`,
    `**Problema:** ${opts.notionContent.problem}`,
    `**Solución:** ${opts.notionContent.solutionSketch}`,
  ];
  const noGos = opts.notionContent.noGos.join(", ");
  if (noGos) fields.push(`**No-Gos:** ${noGos}`);
  const risks = opts.notionContent.risks.join(", ");
  if (risks) fields.push(`**Riesgos:** ${risks}`);
  if (opts.notionContent.successCriteria) fields.push(`**KPIs:** ${opts.notionContent.successCriteria}`);
  if (opts.notionContent.techStack) fields.push(`**Stack:** ${opts.notionContent.techStack}`);
  if (opts.notionContent.additionalNotes) fields.push(`**Notas:** ${opts.notionContent.additionalNotes}`);

  const userMessage = `Analizá este pitch y creá un plan (o pedí info faltante):

${fields.join("\n")}${attachmentsBlock}${additionalBlock}`;

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

  return extractJSON<PlannerResult>(result.content);
}
