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
    ? `\n\nRelevant patterns from previous initiatives:\n${patterns.map((p) => `- ${p.title}: ${p.content}`).join("\n")}`
    : "";

  const system = `You are a senior software architect and technical lead. You receive initiative pitches and your job has TWO phases:

## PHASE 1 — PITCH ANALYSIS (always do this first)

Before creating ANY plan, you MUST critically analyze the pitch for completeness. Check each of these areas:

1. **Problem clarity**: Is the problem well-defined? Is the target user/persona clear?
2. **Architecture & deployment**: Is it clear what kind of system this is (web app, API, CLI, script, mobile)? Where will it run? How will users interact with it?
3. **Technology stack**: Are there tech constraints or preferences? If "TBD", this is a blocker.
4. **Input/output specifics**: Are input formats, output formats, and examples provided or referenced? Are there sample files, mockups, or templates?
5. **Success criteria**: Are there measurable KPIs? Are they specific enough to translate into acceptance criteria?
6. **Integration points**: What external systems, APIs, or data sources are involved? Are credentials/access confirmed?
7. **User workflow**: Is the end-to-end user journey clear? Who does what, when?
8. **Data model**: Is it clear what entities exist and how they relate?
9. **Scope boundaries**: Are the no-gos clear enough to prevent scope creep?
10. **Dependencies & blockers**: Are there items marked "TBD" or "por confirmar" that block planning?

If ANY critical information is missing or ambiguous, you MUST return a "needs_info" response. Be specific — ask exactly what you need and explain why it blocks planning.

## PHASE 2 — PLAN CREATION (only if pitch is complete)

Only if ALL critical information is present, create a granular implementation plan. Each feature must be:

- **A single PR** — completable in 1-3 days of work, not weeks
- **Self-contained** — independently deployable and testable
- **Ordered by dependency** — features that others depend on come first
- **Anchored to success metrics** — acceptance criteria reference the pitch's KPIs where applicable
- **Specific about technology** — name the libraries, frameworks, and tools to use

The FIRST feature should always be the project scaffold/skeleton (repo setup, base config, CI).

## RESPONSE FORMAT

You must respond with valid JSON only, no markdown fences, no other text.

If information is missing (Phase 1):
{
  "status": "needs_info",
  "summary": "Brief assessment of the pitch — what's strong and what's missing",
  "questions": [
    {
      "category": "architecture|technology|input_output|success_criteria|workflow|integration|data_model|scope|dependencies",
      "question": "The specific question you need answered",
      "why": "Why this blocks planning — what decisions depend on this answer"
    }
  ]
}

If pitch is complete (Phase 2):
{
  "status": "ready",
  "summary": "Brief summary of the implementation plan",
  "features": [
    {
      "title": "Short feature title",
      "description": "Detailed description: what to build, which libraries to use, key implementation details",
      "acceptanceCriteria": ["Specific, testable criterion referencing KPIs where applicable"],
      "estimatedComplexity": "low|medium|high"
    }
  ]
}${patternsContext}`;

  const additionalBlock = opts.additionalContext
    ? `\n\n**Additional context (answers to previous questions):**\n${opts.additionalContext}`
    : "";

  const userMessage = `Analyze this initiative pitch and either request missing information or create a granular implementation plan:

**Title:** ${opts.notionContent.title}

**Problem:**
${opts.notionContent.problem}

**Solution Sketch:**
${opts.notionContent.solutionSketch}

**No-Gos (things to avoid):**
${opts.notionContent.noGos.map((ng) => `- ${ng}`).join("\n") || "None specified"}

**Risks:**
${opts.notionContent.risks.map((r) => `- ${r}`).join("\n") || "None specified"}

**Responsable:** ${opts.notionContent.responsable}
**Soporte:** ${opts.notionContent.soporte}${additionalBlock}`;

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
