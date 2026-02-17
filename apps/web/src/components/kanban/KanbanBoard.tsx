import { KanbanColumn } from "./KanbanColumn";
import type { Feature, Task, TaskStatus } from "@/types";

const columns: { key: TaskStatus; label: string }[] = [
  { key: "to_do", label: "To Do" },
  { key: "done", label: "Done" },
  { key: "failed", label: "Failed" },
];

interface KanbanBoardProps {
  features: Feature[];
  onTaskStatusChange?: (taskId: string, featureId: string, status: TaskStatus) => void;
}

export function KanbanBoard({ features, onTaskStatusChange }: KanbanBoardProps) {
  const allTasks: { task: Task; featureName: string; featureId: string }[] = features.flatMap((f) =>
    f.tasks.map((t) => ({ task: t, featureName: f.title, featureId: f.id })),
  );

  const grouped = columns.map((col) => ({
    ...col,
    tasks: allTasks.filter((item) => item.task.status === col.key),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full min-h-[500px]">
      {grouped.map((col) => (
        <KanbanColumn
          key={col.key}
          title={col.label}
          tasks={col.tasks}
          onTaskStatusChange={onTaskStatusChange}
        />
      ))}
    </div>
  );
}
