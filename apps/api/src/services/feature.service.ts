import { supabase } from "../lib/supabase.js";
import type { Feature, FeatureStatus, InsertFeature } from "../models/feature.js";

const TABLE = "features";

export async function createFeature(data: InsertFeature): Promise<Feature> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as Feature;
}

export async function createFeatures(data: InsertFeature[]): Promise<Feature[]> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select();

  if (error) throw error;
  return (rows as Feature[]) ?? [];
}

export async function getFeatureById(id: string): Promise<Feature | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Feature) ?? null;
}

export async function getFeaturesByInitiative(initiativeId: string): Promise<Feature[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("initiative_id", initiativeId)
    .order("sequence_order", { ascending: true });

  if (error) throw error;
  return (data as Feature[]) ?? [];
}

export async function getFeaturesByPlan(planId: string): Promise<Feature[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("plan_id", planId)
    .order("sequence_order", { ascending: true });

  if (error) throw error;
  return (data as Feature[]) ?? [];
}

export async function getNextPendingFeature(initiativeId: string): Promise<Feature | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("initiative_id", initiativeId)
    .eq("status", "pending")
    .order("sequence_order", { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Feature) ?? null;
}

export async function updateFeatureStatus(
  id: string,
  status: FeatureStatus,
  extra?: Partial<Pick<Feature, "branch_name" | "pr_number" | "pr_url" | "rejection_feedback" | "retry_count">>,
): Promise<Feature> {
  const update: Record<string, unknown> = { status, ...extra };

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Feature;
}

export async function allFeaturesMerged(initiativeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("initiative_id", initiativeId)
    .neq("status", "merged");

  if (error) throw error;
  return !data || data.length === 0;
}
