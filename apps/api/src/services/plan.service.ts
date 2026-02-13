import { query } from "../lib/db.js";
import type { Plan, InsertPlan } from "../models/plan.js";

export async function createPlan(data: InsertPlan): Promise<Plan> {
  // Deactivate previous active plans for this initiative
  await query(
    "UPDATE plans SET is_active = false WHERE initiative_id = $1 AND is_active = true",
    [data.initiative_id],
  );

  const result = await query<Plan>(
    `INSERT INTO plans (initiative_id, version, summary, raw_output, feature_count, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.initiative_id,
      data.version ?? 1,
      data.summary,
      data.raw_output ? JSON.stringify(data.raw_output) : null,
      data.feature_count,
      data.is_active ?? true,
    ],
  );
  return result.rows[0];
}

export async function getActivePlan(initiativeId: string): Promise<Plan | null> {
  const result = await query<Plan>(
    "SELECT * FROM plans WHERE initiative_id = $1 AND is_active = true",
    [initiativeId],
  );
  return result.rows[0] ?? null;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const result = await query<Plan>(
    "SELECT * FROM plans WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getNextPlanVersion(initiativeId: string): Promise<number> {
  const result = await query<{ version: number }>(
    "SELECT version FROM plans WHERE initiative_id = $1 ORDER BY version DESC LIMIT 1",
    [initiativeId],
  );
  return result.rows.length > 0 ? result.rows[0].version + 1 : 1;
}
