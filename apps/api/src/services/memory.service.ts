import { supabase } from "../lib/supabase.js";
import type { MemoryEntry, MemoryType, InsertMemoryEntry } from "../models/memory-entry.js";
import type { ListPatternsQuery } from "../models/api-schemas.js";
import { logger } from "../lib/logger.js";

const TABLE = "memory_entries";

export async function createMemoryEntry(data: InsertMemoryEntry): Promise<MemoryEntry> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as MemoryEntry;
}

export async function listPatterns(query: ListPatternsQuery): Promise<{
  data: MemoryEntry[];
  total: number;
}> {
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  let q = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("usage_count", { ascending: false })
    .range(from, to);

  if (query.category) {
    q = q.eq("category", query.category);
  }
  if (query.type) {
    q = q.eq("type", query.type);
  }
  if (query.tags && query.tags.length > 0) {
    q = q.overlaps("tags", query.tags);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: (data as MemoryEntry[]) ?? [], total: count ?? 0 };
}

export async function getRelevantPatterns(
  category: string,
  tags: string[],
): Promise<MemoryEntry[]> {
  let q = supabase
    .from(TABLE)
    .select()
    .order("usage_count", { ascending: false })
    .limit(10);

  if (category) {
    q = q.eq("category", category);
  }
  if (tags.length > 0) {
    q = q.overlaps("tags", tags);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as MemoryEntry[]) ?? [];
}

export async function incrementUsageCount(id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_usage_count", {
    entry_id: id,
  });

  // Fallback if RPC doesn't exist
  if (error) {
    const { data } = await supabase
      .from(TABLE)
      .select("usage_count")
      .eq("id", id)
      .single();

    if (data) {
      await supabase
        .from(TABLE)
        .update({ usage_count: (data as { usage_count: number }).usage_count + 1 })
        .eq("id", id);
    }
  }
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
