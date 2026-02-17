import { useState } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import type { Feature, TaskStatus } from "@/types";

interface FeatureCardProps {
  feature: Feature;
  isDragOverlay?: boolean;
  onTaskStatusChange?: (taskId: string, featureId: string, status: TaskStatus) => void;
}

export function FeatureCard({ feature, isDragOverlay, onTaskStatusChange }: FeatureCardProps) {
  const [open, setOpen] = useState(false);

  const isDraggable = !isDragOverlay && feature.status === "pending";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: feature.id,
    data: { feature },
    disabled: !isDraggable,
  });

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      className={`min-w-0 overflow-hidden ${isDragging ? "opacity-30" : ""} ${isDragOverlay ? "shadow-lg rotate-2 cursor-grabbing" : ""}`}
    >
      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-2">
          {isDraggable && (
            <button
              className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground touch-none"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5 flex-1">
            {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <CardTitle className="text-base select-none">{feature.title}</CardTitle>
          </div>
          <StatusBadge status={feature.status} />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 min-w-0 overflow-hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent>
              <div className="space-y-4 pt-2 min-w-0">
                 {feature.user_story && (
                   <div>
                     <h4 className="text-xs font-semibold text-muted-foreground mb-1">Historia de usuario</h4>
                     <p className="text-sm text-foreground">{feature.user_story}</p>
                   </div>
                 )}

                 {feature.acceptance_criteria && feature.acceptance_criteria.length > 0 && (
                   <div>
                     <h4 className="text-xs font-semibold text-muted-foreground mb-1">Criterios de aceptación</h4>
                     <ul className="list-disc list-inside space-y-1">
                       {feature.acceptance_criteria.map((ac, i) => (
                         <li key={i} className="text-sm text-foreground">{ac}</li>
                       ))}
                     </ul>
                   </div>
                 )}

                 {feature.tasks.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Tareas ({feature.tasks.length})</h4>
                        <div className="space-y-2">
                            {feature.tasks.map((task) => (
                              <KanbanCard
                                key={task.id}
                                task={task}
                                featureName={feature.title}
                                onStatusChange={onTaskStatusChange ? (taskId, status) => onTaskStatusChange(taskId, feature.id, status) : undefined}
                              />
                            ))}
                        </div>
                    </div>
                 )}
              </div>
            </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
