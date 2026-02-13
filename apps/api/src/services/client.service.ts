import { query } from "../lib/db.js";
import type { Client, InsertClient } from "../models/client.js";

export async function createClient(data: InsertClient): Promise<Client> {
  const result = await query<Client>(
    `INSERT INTO clients (name, slug, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.name, data.slug, data.description ?? null],
  );
  return result.rows[0];
}

export async function getClientById(id: string): Promise<Client | null> {
  const result = await query<Client>(
    "SELECT * FROM clients WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listClients(): Promise<Client[]> {
  const result = await query<Client>(
    "SELECT * FROM clients ORDER BY created_at DESC",
  );
  return result.rows;
}
