import { supabase } from "../lib/supabase.js";
import type { Initiative, InitiativeStatus, InsertInitiative } from "../models/initiative.js";

const TABLE = "initiatives";

export async function createInitiative(data: InsertInitiative): Promise<Initiative> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as Initiative;
}

export async function getInitiativeById(id: string): Promise<Initiative | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Initiative) ?? null;
}

export async function listInitiatives(opts: {
  page: number;
  limit: number;
  status?: InitiativeStatus;
}): Promise<{ data: Initiative[]; total: number }> {
  const from = (opts.page - 1) * opts.limit;
  const to = from + opts.limit - 1;

  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Initiative[]) ?? [], total: count ?? 0 };
}

export async function updateInitiativeStatus(
  id: string,
  status: InitiativeStatus,
  errorMessage?: string,
): Promise<Initiative> {
  const update: Record<string, unknown> = { status };
  if (errorMessage !== undefined) update.error_message = errorMessage;

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Initiative;
}

export async function updateInitiative(
  id: string,
  updates: Partial<Pick<Initiative, "title" | "raw_content" | "metadata" | "notion_url" | "status" | "error_message">>,
): Promise<Initiative> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Initiative;
}
