import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "./KanbanCard";
import type { Task, TaskStatus } from "@/types";

interface KanbanColumnProps {
  title: string;
  tasks: { task: Task; featureName: string; featureId: string }[];
  onTaskStatusChange?: (taskId: string, featureId: string, status: TaskStatus) => void;
}

export function KanbanColumn({ title, tasks, onTaskStatusChange }: KanbanColumnProps) {
  return (
    <div className="flex flex-1 min-w-[250px] shrink-0 flex-col rounded-lg bg-muted/50 border h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 rounded-t-lg">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-2">
          {tasks.map(({ task, featureName, featureId }) => (
            <KanbanCard
              key={task.id}
              task={task}
              featureName={featureName}
              onStatusChange={onTaskStatusChange ? (taskId, status) => onTaskStatusChange(taskId, featureId, status) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
