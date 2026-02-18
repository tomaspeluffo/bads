import { callAgent, extractJSON } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";
import type { PitchContent } from "../models/pitch.js";

export async function runPitchAgent(opts: {
  pitchId: string;
  title: string;
  brief: string;
  clientName: string;
}): Promise<PitchContent> {
  const system = `Sos un consultor de ventas técnico senior. Generás propuestas comerciales estructuradas para proyectos de software. Respondé solo con JSON válido sin markdown fences.

El JSON debe tener exactamente esta forma:
{
  "executive_summary": "string",
  "problema": "string",
  "solucion": "string",
  "enfoque_tecnico": "string",
  "entregables": ["string"],
  "metricas_de_exito": ["string"],
  "riesgos": ["string"],
  "proximos_pasos": ["string"]
}

Sé concreto, profesional y orientado al negocio. Usa español.`;

  const userMessage = `Generá una propuesta comercial para el siguiente proyecto:

**Cliente:** ${opts.clientName}
**Título:** ${opts.title}
**Brief:**
${opts.brief}`;

  const result = await callAgent({
    agent: "pitch_agent",
    model: MODELS.PITCH_AGENT,
    maxTokens: MAX_TOKENS.PITCH_AGENT,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  if (result.stopReason === "max_tokens") {
    throw new Error("La respuesta del pitch agent fue truncada (max_tokens). El brief puede ser demasiado largo.");
  }

  return extractJSON<PitchContent>(result.content);
}
