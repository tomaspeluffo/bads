import { supabase } from "../lib/supabase.js";
import type { Plan, InsertPlan } from "../models/plan.js";

const TABLE = "plans";

export async function createPlan(data: InsertPlan): Promise<Plan> {
  // Deactivate previous active plans for this initiative
  await supabase
    .from(TABLE)
    .update({ is_active: false })
    .eq("initiative_id", data.initiative_id)
    .eq("is_active", true);

  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as Plan;
}

export async function getActivePlan(initiativeId: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("initiative_id", initiativeId)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Plan) ?? null;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Plan) ?? null;
}

export async function getNextPlanVersion(initiativeId: string): Promise<number> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("version")
    .eq("initiative_id", initiativeId)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? (data[0] as { version: number }).version + 1 : 1;
}
