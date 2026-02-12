import { supabase } from "../lib/supabase.js";
import type { Task, TaskStatus, InsertTask } from "../models/task.js";

const TABLE = "tasks";

export async function createTask(data: InsertTask): Promise<Task> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as Task;
}

export async function createTasks(data: InsertTask[]): Promise<Task[]> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select();

  if (error) throw error;
  return (rows as Task[]) ?? [];
}

export async function getTasksByFeature(featureId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("feature_id", featureId)
    .order("sequence_order", { ascending: true });

  if (error) throw error;
  return (data as Task[]) ?? [];
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Task) ?? null;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  agentOutput?: Record<string, unknown>,
): Promise<Task> {
  const update: Record<string, unknown> = { status };
  if (agentOutput !== undefined) update.agent_output = agentOutput;

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTasksByFeature(featureId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("feature_id", featureId);

  if (error) throw error;
}
