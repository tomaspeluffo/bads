import { query } from "../lib/db.js";
import type { Initiative, InitiativeStatus, InsertInitiative } from "../models/initiative.js";

export async function createInitiative(data: InsertInitiative): Promise<Initiative> {
  const result = await query<Initiative>(
    `INSERT INTO initiatives (notion_page_id, notion_url, title, raw_content, status, started_by, client_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.notion_page_id,
      data.notion_url ?? null,
      data.title,
      data.raw_content ? JSON.stringify(data.raw_content) : null,
      data.status ?? "pending",
      data.started_by ?? null,
      data.client_id ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ],
  );
  return result.rows[0];
}

export async function getInitiativeById(id: string): Promise<Initiative | null> {
  const result = await query<Initiative>(
    "SELECT * FROM initiatives WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listInitiatives(opts: {
  page: number;
  limit: number;
  status?: InitiativeStatus;
}): Promise<{ data: Initiative[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const params: unknown[] = [opts.limit, offset];
  let whereClause = "";

  if (opts.status) {
    whereClause = "WHERE status = $3";
    params.push(opts.status);
  }

  const result = await query<Initiative & { full_count: string }>(
    `SELECT *, count(*) OVER() AS full_count
     FROM initiatives
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    params,
  );

  const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
  return { data: result.rows, total };
}

export async function listInitiativesByClient(clientId: string): Promise<Initiative[]> {
  const result = await query<Initiative>(
    "SELECT * FROM initiatives WHERE client_id = $1 ORDER BY created_at DESC",
    [clientId],
  );
  return result.rows;
}

export async function updateInitiativeStatus(
  id: string,
  status: InitiativeStatus,
  errorMessage?: string,
): Promise<Initiative> {
  if (errorMessage !== undefined) {
    const result = await query<Initiative>(
      `UPDATE initiatives SET status = $1, error_message = $2 WHERE id = $3 RETURNING *`,
      [status, errorMessage, id],
    );
    return result.rows[0];
  }

  const result = await query<Initiative>(
    `UPDATE initiatives SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return result.rows[0];
}

export async function updateInitiative(
  id: string,
  updates: Partial<Pick<Initiative, "title" | "raw_content" | "metadata" | "notion_url" | "status" | "error_message">>,
): Promise<Initiative> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    if (key === "raw_content" || key === "metadata") {
      params.push(value ? JSON.stringify(value) : null);
    } else {
      params.push(value);
    }
    paramIndex++;
  }

  params.push(id);
  const result = await query<Initiative>(
    `UPDATE initiatives SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    params,
  );
  return result.rows[0];
}

export async function deleteInitiative(id: string): Promise<void> {
  await query("DELETE FROM initiatives WHERE id = $1", [id]);
}
