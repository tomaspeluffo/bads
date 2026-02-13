import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Feature } from "@/types";

interface FeatureCardProps {
  feature: Feature;
  onApprove?: (featureId: string) => void;
  onReject?: (featureId: string, feedback: string) => void;
}

export function FeatureCard({ feature, onApprove, onReject }: FeatureCardProps) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleReject = () => {
    if (feedback.trim().length >= 10) {
      onReject?.(feature.id, feedback);
      setRejecting(false);
      setFeedback("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{feature.title}</CardTitle>
          <StatusBadge status={feature.status} />
        </div>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
        {feature.pr_url && (
          <a
            href={feature.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
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

        {feature.tasks.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-0">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {feature.tasks.length} tasks
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {feature.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{task.title}</span>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
