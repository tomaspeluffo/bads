import { supabase } from "../lib/supabase.js";
import type { AgentExecution, InsertAgentExecution } from "../models/agent-execution.js";

const TABLE = "agent_executions";

export async function logExecution(data: InsertAgentExecution): Promise<AgentExecution> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as AgentExecution;
}

export async function getExecutionsByInitiative(
  initiativeId: string,
): Promise<AgentExecution[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("initiative_id", initiativeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AgentExecution[]) ?? [];
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
