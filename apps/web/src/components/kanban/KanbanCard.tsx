import { Badge } from "@/components/ui/badge";
import type { Task } from "@/types";

const statusDot: Record<string, string> = {
  to_do: "bg-gray-400",
  doing: "bg-blue-400",
  review: "bg-purple-400",
  done: "bg-green-400",
  failed: "bg-red-400",
};

interface KanbanCardProps {
  task: Task;
  featureName: string;
}

export function KanbanCard({ task, featureName }: KanbanCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot[task.status] ?? "bg-gray-400"}`}
        />
        <span className="text-sm font-medium leading-tight">{task.title}</span>
      </div>
      <p className="text-xs text-muted-foreground truncate">{featureName}</p>
      <Badge variant="secondary" className="text-xs">
        {task.task_type}
      </Badge>
    </div>
  );
}
