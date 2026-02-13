import { callAgent } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { Feature } from "../models/feature.js";
import type { Initiative } from "../models/initiative.js";

export interface QAResult {
  approved: boolean;
  score: number;
  checklist: string[];
  issues: string[];
}

export async function runQAAgent(opts: {
  initiativeId: string;
  feature: Feature;
  initiative: Initiative;
  diff: string;
  changedFiles: Array<{ filename: string; content: string }>;
}): Promise<QAResult> {
  const noGos = (opts.initiative.raw_content as Record<string, unknown> | null)?.noGos;
  const noGosText = Array.isArray(noGos) ? noGos.join("\n") : "None specified";

  const system = `You are a senior QA engineer reviewing code changes. You must evaluate the changes against a strict checklist and determine if they should be approved.

**Review Checklist:**
1. Scope vs Spec: Do changes match the feature description and acceptance criteria?
2. No-Go Violations: Do changes violate any explicit no-gos?
3. Security: Are there any security vulnerabilities (injection, XSS, auth issues)?
4. Error Handling: Are errors properly caught and handled?
5. Architectural Coherence: Do changes follow existing patterns and conventions?
6. Edge Cases: Are edge cases handled?
7. Tests: Are there adequate tests?
8. Performance: Are there obvious performance issues?

You must respond with valid JSON only, no other text. Use this exact format:
{
  "approved": true|false,
  "score": 1-10,
  "checklist": [
    "Scope vs Spec: PASS|FAIL - explanation",
    "No-Go Violations: PASS|FAIL - explanation",
    "Security: PASS|FAIL - explanation",
    "Error Handling: PASS|FAIL - explanation",
    "Architectural Coherence: PASS|FAIL - explanation",
    "Edge Cases: PASS|FAIL - explanation",
    "Tests: PASS|FAIL - explanation",
    "Performance: PASS|FAIL - explanation"
  ],
  "issues": ["Issue 1 description", "Issue 2 description"]
}

Only approve if score >= 7 and no critical issues (security, no-go violations).`;

  const filesContext = opts.changedFiles
    .map((f) => `### ${f.filename}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``)
    .join("\n\n");

  const userMessage = `Review these changes for feature: **${opts.feature.title}**

**Feature Description:** ${opts.feature.description}

**Acceptance Criteria:**
${(opts.feature.acceptance_criteria ?? []).map((c) => `- ${c}`).join("\n") || "None specified"}

**No-Gos:**
${noGosText}

**Diff:**
\`\`\`diff
${opts.diff.slice(0, 5000)}
\`\`\`

**Changed Files:**
${filesContext}`;

  const result = await callAgent({
    agent: "qa",
    initiativeId: opts.initiativeId,
    featureId: opts.feature.id,
    model: MODELS.QA,
    maxTokens: MAX_TOKENS.QA,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const cleaned = result.content
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as QAResult;
}
