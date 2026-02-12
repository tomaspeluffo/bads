import { Client } from "@notionhq/client";
import { env } from "../config/env.js";

export const notion = env.NOTION_API_KEY
  ? new Client({ auth: env.NOTION_API_KEY })
  : null;

export function getNotionClient(): Client {
  if (!notion) {
    throw new Error("NOTION_API_KEY is not configured");
  }
  return notion;
}
