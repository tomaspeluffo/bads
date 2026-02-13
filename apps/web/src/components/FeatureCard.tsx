import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Feature } from "@/types";

const DRAGGABLE_STATUSES = ["pending", "failed", "rejected", "developing"];

interface FeatureCardProps {
  feature: Feature;
  onApprove?: (featureId: string) => void;
  onReject?: (featureId: string, feedback: string) => void;
  isDragOverlay?: boolean;
}

export function FeatureCard({ feature, onApprove, onReject, isDragOverlay }: FeatureCardProps) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const isDraggable = !isDragOverlay && DRAGGABLE_STATUSES.includes(feature.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: feature.id,
    data: { feature },
    disabled: !isDraggable,
  });

  const handleReject = () => {
    if (feedback.trim().length >= 10) {
      onReject?.(feature.id, feedback);
      setRejecting(false);
      setFeedback("");
    }
  };

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      className={`${isDragging ? "opacity-30" : ""} ${isDragOverlay ? "shadow-lg rotate-2 cursor-grabbing" : ""}`}
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
          <CardTitle className="text-base select-none flex-1">{feature.title}</CardTitle>
          <StatusBadge status={feature.status} />
        </div>
        {feature.pr_url && (
          <a
            href={feature.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            PR #{feature.pr_number} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {feature.status === "human_review" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onApprove?.(feature.id)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejecting(!rejecting)}
            >
              Reject
            </Button>
          </div>
        )}

        {rejecting && (
          <div className="space-y-2">
            <Textarea
              placeholder="Feedback (min 10 characters)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={feedback.trim().length < 10}
            >
              Submit Rejection
            </Button>
          </div>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent>
              <div className="space-y-4 pt-2">
                 {feature.user_story && (
                   <div>
                     <h4 className="text-xs font-semibold text-muted-foreground mb-1">Historia de usuario</h4>
                     <p className="text-sm text-foreground">{feature.user_story}</p>
                   </div>
                 )}

                 <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Descripción</h4>
                    <p className="text-sm text-foreground">{feature.description}</p>
                 </div>

                 {feature.developer_context && (
                   <div>
                     <h4 className="text-xs font-semibold text-muted-foreground mb-1">Contexto para desarrollo</h4>
                     <p className="text-sm text-foreground whitespace-pre-wrap">{feature.developer_context}</p>
                   </div>
                 )}

                 {feature.tasks.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Tareas ({feature.tasks.length})</h4>
                        <div className="space-y-1">
                            {feature.tasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-muted/30"
                            >
                                <span>{task.title}</span>
                                <StatusBadge status={task.status} />
                            </div>
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
