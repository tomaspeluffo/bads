import { query } from "../lib/db.js";
import type { AgentExecution, InsertAgentExecution } from "../models/agent-execution.js";

export async function logExecution(data: InsertAgentExecution): Promise<AgentExecution> {
  const result = await query<AgentExecution>(
    `INSERT INTO agent_executions (agent, initiative_id, feature_id, task_id, input_tokens, output_tokens, duration_ms, model, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.agent,
      data.initiative_id,
      data.feature_id ?? null,
      data.task_id ?? null,
      data.input_tokens,
      data.output_tokens,
      data.duration_ms,
      data.model,
      data.status,
    ],
  );
  return result.rows[0];
}

export async function getExecutionsByInitiative(
  initiativeId: string,
): Promise<AgentExecution[]> {
  const result = await query<AgentExecution>(
    "SELECT * FROM agent_executions WHERE initiative_id = $1 ORDER BY created_at ASC",
    [initiativeId],
  );
  return result.rows;
}

export async function getExecutionMetrics(initiativeId: string): Promise<{
  totalTokens: number;
  totalDurationMs: number;
  executionCount: number;
}> {
  const executions = await getExecutionsByInitiative(initiativeId);
  return {
    totalTokens: executions.reduce(
      (sum, e) => sum + e.input_tokens + e.output_tokens,
      0,
    ),
    totalDurationMs: executions.reduce((sum, e) => sum + e.duration_ms, 0),
    executionCount: executions.length,
  };
}
