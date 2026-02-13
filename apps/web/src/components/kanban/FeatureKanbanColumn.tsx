import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeatureCard } from "@/components/FeatureCard";
import type { Feature } from "@/types";

interface FeatureKanbanColumnProps {
  title: string;
  features: Feature[];
  onApprove?: (featureId: string) => void;
  onReject?: (featureId: string, feedback: string) => void;
}

export function FeatureKanbanColumn({ 
  title, 
  features,
  onApprove,
  onReject
}: FeatureKanbanColumnProps) {
  return (
    <div className="flex flex-1 min-w-[300px] shrink-0 flex-col rounded-lg bg-muted/50 border h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 rounded-t-lg">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {features.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          {features.map((feature) => (
            <FeatureCard 
              key={feature.id} 
              feature={feature} 
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
