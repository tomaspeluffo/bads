import { query } from "../lib/db.js";
import type { MemoryEntry, MemoryType, InsertMemoryEntry } from "../models/memory-entry.js";
import type { ListPatternsQuery } from "../models/api-schemas.js";
import { logger } from "../lib/logger.js";

export async function createMemoryEntry(data: InsertMemoryEntry): Promise<MemoryEntry> {
  const result = await query<MemoryEntry>(
    `INSERT INTO memory_entries (type, category, title, content, source_initiative_id, tags, usage_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.type,
      data.category,
      data.title,
      data.content,
      data.source_initiative_id ?? null,
      data.tags ?? null,
      data.usage_count ?? 0,
    ],
  );
  return result.rows[0];
}

export async function listPatterns(opts: ListPatternsQuery): Promise<{
  data: MemoryEntry[];
  total: number;
}> {
  const offset = (opts.page - 1) * opts.limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (opts.category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(opts.category);
    paramIndex++;
  }
  if (opts.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(opts.type);
    paramIndex++;
  }
  if (opts.tags && opts.tags.length > 0) {
    conditions.push(`tags && $${paramIndex}`);
    params.push(opts.tags);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(opts.limit, offset);

  const result = await query<MemoryEntry & { full_count: string }>(
    `SELECT *, count(*) OVER() AS full_count
     FROM memory_entries
     ${whereClause}
     ORDER BY usage_count DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params,
  );

  const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
  return { data: result.rows, total };
}

export async function getRelevantPatterns(
  category: string,
  tags: string[],
): Promise<MemoryEntry[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }
  if (tags.length > 0) {
    conditions.push(`tags && $${paramIndex}`);
    params.push(tags);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<MemoryEntry>(
    `SELECT * FROM memory_entries
     ${whereClause}
     ORDER BY usage_count DESC
     LIMIT 10`,
    params,
  );
  return result.rows;
}

export async function incrementUsageCount(id: string): Promise<void> {
  await query(
    "UPDATE memory_entries SET usage_count = usage_count + 1 WHERE id = $1",
    [id],
  );
}

export async function extractAndStorePatterns(
  initiativeId: string,
  patterns: Array<{
    type: MemoryType;
    category: string;
    title: string;
    content: string;
    tags: string[];
  }>,
): Promise<MemoryEntry[]> {
  const entries: InsertMemoryEntry[] = patterns.map((p) => ({
    ...p,
    source_initiative_id: initiativeId,
    usage_count: 0,
  }));

  const results: MemoryEntry[] = [];
  for (const entry of entries) {
    try {
      const created = await createMemoryEntry(entry);
      results.push(created);
    } catch (err) {
      logger.warn({ err, entry: entry.title }, "Failed to store memory entry");
    }
  }

  return results;
}

export async function generateClaudeMdContent(
  patterns: MemoryEntry[],
): Promise<string> {
  const sections = patterns.reduce(
    (acc, p) => {
      const key = p.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, MemoryEntry[]>,
  );

  let content = "# BADS Learned Patterns\n\n";

  for (const [category, entries] of Object.entries(sections)) {
    content += `## ${category}\n\n`;
    for (const entry of entries) {
      content += `### ${entry.title}\n`;
      content += `${entry.content}\n\n`;
    }
  }

  return content;
}
