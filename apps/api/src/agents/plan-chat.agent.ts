import { callAgent } from "./base-agent.js";
import { MODELS } from "../config/constants.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlanChatFeature {
  title: string;
  description: string;
  sequence_order: number;
}

export async function runPlanChatAgent(opts: {
  initiativeId: string;
  plan: { summary: string; features: PlanChatFeature[] };
  history: ChatMessage[];
  userMessage: string;
}): Promise<string> {
  const featuresText = opts.plan.features
    .map((f) => `${f.sequence_order}. **${f.title}**: ${f.description}`)
    .join("\n");

  const system = `Sos el tech lead que creó este plan de implementación. El usuario quiere entender o cuestionar decisiones técnicas. Podés sugerir cambios concretos al plan. Respondé en español, sé conciso.

**Resumen del plan:**
${opts.plan.summary}

**Features planificadas:**
${featuresText}`;

  const messages = [
    ...opts.history,
    { role: "user" as const, content: opts.userMessage },
  ];

  const result = await callAgent({
    agent: "planner",
    initiativeId: opts.initiativeId,
    model: MODELS.PLANNER,
    maxTokens: 1024,
    system,
    messages,
  });

  return result.content;
}
