import { FeatureKanbanColumn } from "./FeatureKanbanColumn";
import type { Feature, FeatureStatus } from "@/types";

interface FeatureKanbanBoardProps {
  features: Feature[];
  onApprove?: (featureId: string) => void;
  onReject?: (featureId: string, feedback: string) => void;
}

// Group definitions
const columns: { title: string; statuses: FeatureStatus[] }[] = [
  { 
    title: "Backlog", 
    statuses: ["pending", "decomposing"] 
  },
  { 
    title: "In Progress", 
    statuses: ["developing"] 
  },
  { 
    title: "Review", 
    statuses: ["qa_review", "human_review"] 
  },
  { 
    title: "Done", 
    statuses: ["approved", "merging", "merged"] 
  },
  { 
    title: "Failed / Rejected", 
    statuses: ["rejected", "failed"] 
  },
];

export function FeatureKanbanBoard({ features, onApprove, onReject }: FeatureKanbanBoardProps) {
  
  // Helper to group features by column
  const getFeaturesForColumn = (columnStatuses: FeatureStatus[]) => {
    return features.filter((feature) => columnStatuses.includes(feature.status));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full min-h-[500px]">
      {columns.map((col) => {
        const colFeatures = getFeaturesForColumn(col.statuses);
        
        return (
          <FeatureKanbanColumn 
            key={col.title} 
            title={col.title} 
            features={colFeatures}
            onApprove={onApprove}
            onReject={onReject}
          />
        );
      })}
    </div>
  );
}
