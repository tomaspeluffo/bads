---
name: new-agent
description: Create a new AI agent in the bads backend following the callAgent + extractJSON pattern
argument-hint: "<agent-name> - e.g. 'reviewer'"
---

Crea un nuevo agente de IA en `apps/api/src/agents/` para: `$ARGUMENTS`

## Estructura a crear

### 1. Tipo de agente en `apps/api/src/models/agent-execution.ts`

Agregar el nuevo tipo al union type `AgentType`:
```typescript
export type AgentType = "planner" | "task_decomposer" | "developer" | "qa" | "<new-agent>";
```

### 2. Constantes en `apps/api/src/config/constants.ts`

Agregar al objeto `MODELS` y `MAX_TOKENS`:
```typescript
export const MODELS = {
  // ...existing...
  NEW_AGENT: "claude-haiku-4-5-20251001",
} as const;

export const MAX_TOKENS = {
  // ...existing...
  NEW_AGENT: 4096,
} as const;
```

### 3. Archivo del agente `apps/api/src/agents/<name>.agent.ts`

```typescript
import { callAgent, extractJSON } from "./base-agent.js";
import { MODELS, MAX_TOKENS } from "../config/constants.js";

// Definir tipos de input y output
interface AgentInput {
  initiativeId: string;
  // otros campos necesarios
}

interface AgentOutput {
  // estructura del JSON que devuelve el modelo
}

export async function run<AgentName>Agent(opts: AgentInput): Promise<AgentOutput> {
  const system = `<instrucciones del sistema en español>

## Formato JSON (sin markdown fences)
{"campo": "valor"}`;

  const userMessage = `<mensaje de usuario con el contexto necesario>`;

  const result = await callAgent({
    agent: "<agent-type>",
    initiativeId: opts.initiativeId,
    model: MODELS.NEW_AGENT,
    maxTokens: MAX_TOKENS.NEW_AGENT,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  return extractJSON<AgentOutput>(result.content);
}
```

## Reglas del agente

- El system prompt debe estar en español
- El system prompt debe especificar el formato JSON de respuesta esperado
- Indicar explícitamente "sin markdown fences" en el prompt
- Minimizar el payload: sólo enviar datos necesarios al modelo
- Nunca enviar claves de API ni información sensible al modelo
- Usar `MODELS.HAIKU` (claude-haiku-4-5-20251001) para tareas simples, modelos más capaces sólo si es necesario
- Tipar el retorno de `extractJSON<T>()` con la interfaz de output definida
- El `agent` field en `callAgent()` debe coincidir con un valor de `AgentType`

## Logging automático

`callAgent()` ya registra automáticamente en `agent_executions` (tokens, duración, modelo). No necesitás agregar logging manual.

## Verificación

```bash
cd apps/api && npm run typecheck && npm run lint
```
