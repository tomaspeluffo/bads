import { query } from "../lib/db.js";
import type { Task, TaskStatus, InsertTask } from "../models/task.js";

export async function createTask(data: InsertTask): Promise<Task> {
  const result = await query<Task>(
    `INSERT INTO tasks (feature_id, sequence_order, title, description, task_type, file_paths, status, agent_output)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.feature_id,
      data.sequence_order,
      data.title,
      data.description,
      data.task_type,
      data.file_paths ?? null,
      data.status ?? "to_do",
      data.agent_output ? JSON.stringify(data.agent_output) : null,
    ],
  );
  return result.rows[0];
}

export async function createTasks(data: InsertTask[]): Promise<Task[]> {
  const results: Task[] = [];
  for (const item of data) {
    const row = await createTask(item);
    results.push(row);
  }
  return results;
}

export async function getTasksByFeature(featureId: string): Promise<Task[]> {
  const result = await query<Task>(
    "SELECT * FROM tasks WHERE feature_id = $1 ORDER BY sequence_order ASC",
    [featureId],
  );
  return result.rows;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const result = await query<Task>(
    "SELECT * FROM tasks WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  agentOutput?: Record<string, unknown>,
): Promise<Task> {
  if (agentOutput !== undefined) {
    const result = await query<Task>(
      `UPDATE tasks SET status = $1, agent_output = $2 WHERE id = $3 RETURNING *`,
      [status, JSON.stringify(agentOutput), id],
    );
    return result.rows[0];
  }

  const result = await query<Task>(
    `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return result.rows[0];
}

export async function deleteTasksByFeature(featureId: string): Promise<void> {
  await query("DELETE FROM tasks WHERE feature_id = $1", [featureId]);
}
