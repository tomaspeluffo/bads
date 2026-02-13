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

  const system = `Eres un arquitecto de software senior y tech lead. Recibís pitches de iniciativas y tu trabajo tiene DOS fases.

IMPORTANTE: Todas tus respuestas (summary, questions, descriptions, etc.) DEBEN estar en español.

## FASE 1 — ANÁLISIS DEL PITCH (siempre hacé esto primero)

Antes de crear CUALQUIER plan, DEBÉS analizar críticamente el pitch para verificar que está completo. Revisá cada una de estas áreas:

1. **Claridad del problema**: ¿Está bien definido el problema? ¿Está claro el usuario/persona objetivo?
2. **Arquitectura y despliegue**: ¿Está claro qué tipo de sistema es (web app, API, CLI, script, mobile)? ¿Dónde va a correr? ¿Cómo interactúan los usuarios?
3. **Stack tecnológico**: ¿Hay restricciones o preferencias de tecnología? Si dice "TBD", esto es un bloqueante.
4. **Entradas/salidas específicas**: ¿Se proporcionan o referencian formatos de entrada, salida y ejemplos? ¿Hay archivos de ejemplo, mockups o templates?
5. **Criterios de éxito**: ¿Hay KPIs medibles? ¿Son lo suficientemente específicos para traducirse en criterios de aceptación?
6. **Puntos de integración**: ¿Qué sistemas externos, APIs o fuentes de datos están involucrados? ¿Están confirmados los accesos/credenciales?
7. **Flujo del usuario**: ¿Está claro el recorrido end-to-end del usuario? ¿Quién hace qué, cuándo?
8. **Modelo de datos**: ¿Está claro qué entidades existen y cómo se relacionan?
9. **Límites de alcance**: ¿Son claros los no-gos para prevenir scope creep?
10. **Dependencias y bloqueantes**: ¿Hay items marcados como "TBD" o "por confirmar" que bloquean la planificación?

Si CUALQUIER información crítica falta o es ambigua, DEBÉS devolver una respuesta "needs_info". Sé específico — preguntá exactamente qué necesitás y explicá por qué bloquea la planificación.

## FASE 2 — CREACIÓN DEL PLAN (solo si el pitch está completo)

Solo si TODA la información crítica está presente, creá un plan de implementación granular. Cada feature debe ser:

- **Un solo PR** — completable en 1-3 días de trabajo, no semanas
- **Autocontenido** — deployable y testeable independientemente
- **Ordenado por dependencia** — features de los que otros dependen van primero
- **Anclado a métricas de éxito** — los criterios de aceptación referencian los KPIs del pitch donde aplique
- **Específico sobre tecnología** — nombrá las librerías, frameworks y herramientas a usar

El PRIMER feature siempre debe ser el scaffold/skeleton del proyecto (setup del repo, config base, CI).

## FORMATO DE RESPUESTA

Debés responder SOLO con JSON válido, sin markdown fences, sin otro texto.

Si falta información (Fase 1):
{
  "status": "needs_info",
  "summary": "Evaluación breve del pitch — qué está bien y qué falta",
  "questions": [
    {
      "category": "architecture|technology|input_output|success_criteria|workflow|integration|data_model|scope|dependencies",
      "question": "La pregunta específica que necesitás que respondan",
      "why": "Por qué esto bloquea la planificación — qué decisiones dependen de esta respuesta"
    }
  ]
}

Si el pitch está completo (Fase 2):
{
  "status": "ready",
  "summary": "Resumen breve del plan de implementación",
  "features": [
    {
      "title": "Título corto del feature",
      "description": "Descripción detallada: qué construir, qué librerías usar, detalles clave de implementación",
      "acceptanceCriteria": ["Criterio específico y testeable, referenciando KPIs donde aplique"],
      "estimatedComplexity": "low|medium|high"
    }
  ]
}${patternsContext}`;

  // Include attached file contents if present
  const attachments = (opts.notionContent as unknown as Record<string, unknown>).attachments as Array<{ filename: string; text: string }> | undefined;
  const attachmentsBlock = attachments && attachments.length > 0
    ? `\n\n**Documentos adjuntos:**\n${attachments.map((a) => `--- ${a.filename} ---\n${a.text}`).join("\n\n")}`
    : "";

  const additionalBlock = opts.additionalContext
    ? `\n\n**Contexto adicional (respuestas a preguntas anteriores):**\n${opts.additionalContext}`
    : "";

  const userMessage = `Analizá este pitch de iniciativa y solicitá la información faltante o creá un plan de implementación granular:

**Título:** ${opts.notionContent.title}

**Problema:**
${opts.notionContent.problem}

**Solución propuesta:**
${opts.notionContent.solutionSketch}

**No-Gos (cosas a evitar):**
${opts.notionContent.noGos.map((ng) => `- ${ng}`).join("\n") || "No especificados"}

**Riesgos:**
${opts.notionContent.risks.map((r) => `- ${r}`).join("\n") || "No especificados"}

**Definición de éxito / KPIs:**
${opts.notionContent.successCriteria || "No especificados"}

**Stack tecnológico:**
${opts.notionContent.techStack || "No especificado"}

**Notas adicionales (costo, timeline, fase, etc.):**
${opts.notionContent.additionalNotes || "No especificadas"}

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

  // Strip markdown fences (```json ... ```) that the model sometimes adds
  const cleaned = result.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as PlannerResult;
}
