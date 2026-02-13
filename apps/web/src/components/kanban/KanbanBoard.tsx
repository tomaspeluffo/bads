import { KanbanColumn } from "./KanbanColumn";
import type { Feature, Task, TaskStatus } from "@/types";

const columns: { key: TaskStatus; label: string }[] = [
  { key: "to_do", label: "To Do" },
  { key: "doing", label: "Doing" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
  { key: "failed", label: "Failed" },
];

interface KanbanBoardProps {
  features: Feature[];
}

export function KanbanBoard({ features }: KanbanBoardProps) {
  const featureMap = new Map(features.map((f) => [f.id, f.title]));

  const allTasks: { task: Task; featureName: string }[] = features.flatMap((f) =>
    f.tasks.map((t) => ({ task: t, featureName: featureMap.get(f.id) ?? "" })),
  );

  const grouped = columns.map((col) => ({
    ...col,
    tasks: allTasks.filter((item) => item.task.status === col.key),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {grouped.map((col) => (
        <KanbanColumn key={col.key} title={col.label} tasks={col.tasks} />
      ))}
    </div>
  );
}
