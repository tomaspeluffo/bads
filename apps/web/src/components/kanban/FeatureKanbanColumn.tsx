import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/FeatureCard";
import type { Feature, TaskStatus } from "@/types";

interface FeatureKanbanColumnProps {
  columnId: string;
  title: string;
  features: Feature[];
  activeFeatureId?: string;
  onTaskStatusChange?: (taskId: string, featureId: string, status: TaskStatus) => void;
}

export function FeatureKanbanColumn({
  columnId,
  title,
  features,
  onTaskStatusChange,
}: FeatureKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[320px] shrink-0 flex-col rounded-lg bg-muted/50 border h-full overflow-hidden transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 rounded-t-lg">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {features.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onTaskStatusChange={onTaskStatusChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
