import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanCard } from "./KanbanCard";
import type { Task } from "@/types";

interface KanbanColumnProps {
  title: string;
  tasks: { task: Task; featureName: string }[];
}

export function KanbanColumn({ title, tasks }: KanbanColumnProps) {
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {tasks.map(({ task, featureName }) => (
            <KanbanCard key={task.id} task={task} featureName={featureName} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
