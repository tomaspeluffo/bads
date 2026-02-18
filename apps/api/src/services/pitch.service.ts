import { query } from "../lib/db.js";
import type { Pitch, PitchStatus, InsertPitch, PitchContent } from "../models/pitch.js";

export async function createPitch(data: InsertPitch): Promise<Pitch> {
  const result = await query<Pitch>(
    `INSERT INTO pitches (client_id, title, brief, client_name, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.client_id ?? null,
      data.title,
      data.brief,
      data.client_name,
      data.created_by ?? null,
    ],
  );
  return result.rows[0];
}

export async function getPitchById(id: string): Promise<Pitch | null> {
  const result = await query<Pitch>(
    "SELECT * FROM pitches WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listPitches(opts: {
  page: number;
  limit: number;
  clientId?: string;
}): Promise<{ data: Pitch[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const params: unknown[] = [opts.limit, offset];
  let whereClause = "";

  if (opts.clientId) {
    whereClause = "WHERE client_id = $3";
    params.push(opts.clientId);
  }

  const result = await query<Pitch & { full_count: string }>(
    `SELECT *, count(*) OVER() AS full_count
     FROM pitches
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    params,
  );

  const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
  return { data: result.rows, total };
}

export async function updatePitchStatus(
  id: string,
  status: PitchStatus,
  errorMessage?: string,
): Promise<Pitch> {
  if (errorMessage !== undefined) {
    const result = await query<Pitch>(
      `UPDATE pitches SET status = $1, error_message = $2 WHERE id = $3 RETURNING *`,
      [status, errorMessage, id],
    );
    return result.rows[0];
  }

  const result = await query<Pitch>(
    `UPDATE pitches SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return result.rows[0];
}

export async function updatePitch(
  id: string,
  updates: Partial<Pick<Pitch, "title" | "status" | "error_message" | "initiative_id"> & { content: PitchContent | null }>,
): Promise<Pitch> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex}`);
    if (key === "content") {
      params.push(value ? JSON.stringify(value) : null);
    } else {
      params.push(value);
    }
    paramIndex++;
  }

  params.push(id);
  const result = await query<Pitch>(
    `UPDATE pitches SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    params,
  );
  return result.rows[0];
}

export async function deletePitch(id: string): Promise<void> {
  await query("DELETE FROM pitches WHERE id = $1", [id]);
}

export async function convertPitchToInitiative(
  pitchId: string,
  initiativeId: string,
): Promise<void> {
  await query(
    `UPDATE pitches SET status = 'converted', initiative_id = $1 WHERE id = $2`,
    [initiativeId, pitchId],
  );
}
