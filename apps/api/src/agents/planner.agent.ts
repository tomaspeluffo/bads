import { callAgent } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import * as memoryService from "../services/memory.service.js";
import type { NotionPageContent } from "../services/notion.service.js";

export interface PlannerResult {
  summary: string;
  features: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    estimatedComplexity: "low" | "medium" | "high";
  }>;
}

export async function runPlannerAgent(opts: {
  initiativeId: string;
  notionContent: NotionPageContent;
}): Promise<PlannerResult> {
  // Get relevant patterns from memory
  const patterns = await memoryService.getRelevantPatterns("", ["planning"]).catch(() => []);
  const patternsContext = patterns.length > 0
    ? `\n\nRelevant patterns from previous initiatives:\n${patterns.map((p) => `- ${p.title}: ${p.content}`).join("\n")}`
    : "";

  const system = `You are a senior software architect. Your job is to analyze an initiative document and create a structured implementation plan with ordered features.

Each feature should be:
- Self-contained and independently implementable
- Ordered by dependency (features that other features depend on come first)
- Small enough to be a single PR but large enough to be meaningful

You must respond with valid JSON only, no other text. Use this exact format:
{
  "summary": "Brief summary of the plan",
  "features": [
    {
      "title": "Short feature title",
      "description": "Detailed description of what needs to be built",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "estimatedComplexity": "low|medium|high"
    }
  ]
}${patternsContext}`;

  const userMessage = `Analyze this initiative and create an implementation plan:

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
**Soporte:** ${opts.notionContent.soporte}`;

  const result = await callAgent({
    agent: "planner",
    initiativeId: opts.initiativeId,
    model: MODELS.PLANNER,
    maxTokens: MAX_TOKENS.PLANNER,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  return JSON.parse(result.content) as PlannerResult;
}
