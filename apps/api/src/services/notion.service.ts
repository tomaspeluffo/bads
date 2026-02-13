import { getNotionClient } from "../lib/notion.js";
import { createChildLogger } from "../lib/logger.js";

const log = createChildLogger({ service: "notion" });

export interface NotionPageContent {
  title: string;
  url: string | null;
  problem: string;
  solutionSketch: string;
  noGos: string[];
  risks: string[];
  successCriteria: string;
  techStack: string;
  additionalNotes: string;
  responsable: string;
  soporte: string;
  rawBlocks: unknown[];
}

export async function fetchAndParseNotionPage(pageId: string): Promise<NotionPageContent> {
  const notion = getNotionClient();

  // Fetch page metadata
  const page = await notion.pages.retrieve({ page_id: pageId }) as Record<string, unknown>;

  // Fetch page blocks (content)
  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  const title = extractTitle(page);
  const url = (page as { url?: string }).url ?? null;
  const content = parseBlocks(blocks.results);

  log.info({ pageId, title, blockCount: blocks.results.length }, "Notion page fetched");

  return {
    title,
    url,
    ...content,
    rawBlocks: blocks.results,
  };
}

function extractTitle(page: Record<string, unknown>): string {
  const properties = page.properties as Record<string, unknown> | undefined;
  if (!properties) return "Untitled";

  // Try common title property names
  for (const key of ["title", "Title", "Name", "name"]) {
    const prop = properties[key] as { title?: Array<{ plain_text: string }> } | undefined;
    if (prop?.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
  }

  return "Untitled";
}

function parseBlocks(blocks: unknown[]): Omit<NotionPageContent, "title" | "url" | "rawBlocks"> {
  const sections: Record<string, string[]> = {};
  let currentSection = "";

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const type = b.type as string;

    if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
      const heading = b[type] as { rich_text: Array<{ plain_text: string }> };
      currentSection = heading.rich_text.map((t) => t.plain_text).join("").toLowerCase();
    } else if (type === "paragraph" || type === "bulleted_list_item" || type === "numbered_list_item") {
      const content = b[type] as { rich_text: Array<{ plain_text: string }> };
      const text = content.rich_text.map((t) => t.plain_text).join("");
      if (text.trim()) {
        if (!sections[currentSection]) sections[currentSection] = [];
        sections[currentSection].push(text);
      }
    }
  }

  return {
    problem: findSection(sections, ["problema", "problem", "contexto", "context"]),
    solutionSketch: findSection(sections, ["solution sketch", "solucion", "propuesta", "solution"]),
    noGos: findListSection(sections, ["no-gos", "no gos", "restricciones", "constraints"]),
    risks: findListSection(sections, ["riesgos", "risks", "risk"]),
    successCriteria: findSection(sections, ["definición de éxito", "definicion de exito", "success criteria", "criterios de éxito", "criterios de exito", "kpis"]),
    techStack: findSection(sections, ["stack", "tecnología", "tecnologia", "technology", "tech stack"]),
    additionalNotes: findSection(sections, ["notas", "notes", "adicional", "additional", "costo", "cost", "timeline", "fase"]),
    responsable: findSection(sections, ["responsable", "owner", "responsible"]),
    soporte: findSection(sections, ["soporte", "support"]),
  };
}

function findSection(sections: Record<string, string[]>, keys: string[]): string {
  for (const key of keys) {
    for (const sectionKey of Object.keys(sections)) {
      if (sectionKey.includes(key)) {
        return sections[sectionKey].join("\n");
      }
    }
  }
  return "";
}

function findListSection(sections: Record<string, string[]>, keys: string[]): string[] {
  for (const key of keys) {
    for (const sectionKey of Object.keys(sections)) {
      if (sectionKey.includes(key)) {
        return sections[sectionKey];
      }
    }
  }
  return [];
}
