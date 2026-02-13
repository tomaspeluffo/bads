import { query } from "../lib/db.js";
import type { Feature, FeatureStatus, InsertFeature } from "../models/feature.js";

export async function createFeature(data: InsertFeature): Promise<Feature> {
  const result = await query<Feature>(
    `INSERT INTO features (plan_id, initiative_id, sequence_order, title, description, acceptance_criteria, branch_name, status, retry_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.plan_id,
      data.initiative_id,
      data.sequence_order,
      data.title,
      data.description,
      data.acceptance_criteria ?? null,
      data.branch_name ?? null,
      data.status ?? "pending",
      data.retry_count ?? 0,
    ],
  );
  return result.rows[0];
}

export async function createFeatures(data: InsertFeature[]): Promise<Feature[]> {
  const results: Feature[] = [];
  for (const item of data) {
    const row = await createFeature(item);
    results.push(row);
  }
  return results;
}

export async function getFeatureById(id: string): Promise<Feature | null> {
  const result = await query<Feature>(
    "SELECT * FROM features WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getFeaturesByInitiative(initiativeId: string): Promise<Feature[]> {
  const result = await query<Feature>(
    "SELECT * FROM features WHERE initiative_id = $1 ORDER BY sequence_order ASC",
    [initiativeId],
  );
  return result.rows;
}

export async function getFeaturesByPlan(planId: string): Promise<Feature[]> {
  const result = await query<Feature>(
    "SELECT * FROM features WHERE plan_id = $1 ORDER BY sequence_order ASC",
    [planId],
  );
  return result.rows;
}

export async function getNextPendingFeature(initiativeId: string): Promise<Feature | null> {
  const result = await query<Feature>(
    `SELECT * FROM features
     WHERE initiative_id = $1 AND status = 'pending'
     ORDER BY sequence_order ASC
     LIMIT 1`,
    [initiativeId],
  );
  return result.rows[0] ?? null;
}

export async function updateFeatureStatus(
  id: string,
  status: FeatureStatus,
  extra?: Partial<Pick<Feature, "branch_name" | "pr_number" | "pr_url" | "rejection_feedback" | "retry_count">>,
): Promise<Feature> {
  const setClauses: string[] = ["status = $1"];
  const params: unknown[] = [status];
  let paramIndex = 2;

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  params.push(id);
  const result = await query<Feature>(
    `UPDATE features SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    params,
  );
  return result.rows[0];
}

export async function allFeaturesMerged(initiativeId: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    "SELECT id FROM features WHERE initiative_id = $1 AND status != 'merged'",
    [initiativeId],
  );
  return result.rows.length === 0;
}
