import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { FeatureKanbanColumn } from "./FeatureKanbanColumn";
import { FeatureCard } from "@/components/FeatureCard";
import type { Feature, FeatureStatus } from "@/types";

interface FeatureKanbanBoardProps {
  features: Feature[];
  onApprove?: (featureId: string) => void;
  onReject?: (featureId: string, feedback: string) => void;
  onMove?: (featureId: string, targetColumn: "in_progress" | "review") => void;
}

// Column IDs that map to backend targetColumn values
const COLUMN_ID_IN_PROGRESS = "in_progress";
const COLUMN_ID_REVIEW = "review";

// Group definitions
const columns: { id: string; title: string; statuses: FeatureStatus[] }[] = [
  {
    id: "backlog",
    title: "Backlog",
    statuses: ["pending", "decomposing"],
  },
  {
    id: COLUMN_ID_IN_PROGRESS,
    title: "In Progress",
    statuses: ["developing"],
  },
  {
    id: COLUMN_ID_REVIEW,
    title: "Review",
    statuses: ["qa_review", "human_review"],
  },
  {
    id: "done",
    title: "Done",
    statuses: ["approved", "merging", "merged"],
  },
  {
    id: "failed",
    title: "Failed / Rejected",
    statuses: ["rejected", "failed"],
  },
];

// Allowed moves: feature.status -> valid target column IDs
const ALLOWED_MOVES: Record<string, string[]> = {
  pending: [COLUMN_ID_IN_PROGRESS],
  failed: [COLUMN_ID_IN_PROGRESS],
  rejected: [COLUMN_ID_IN_PROGRESS],
  developing: [COLUMN_ID_REVIEW],
};

export function FeatureKanbanBoard({ features, onApprove, onReject, onMove }: FeatureKanbanBoardProps) {
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

  const getFeaturesForColumn = (columnStatuses: FeatureStatus[]) => {
    return features.filter((feature) => columnStatuses.includes(feature.status));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const feature = event.active.data.current?.feature as Feature | undefined;
    setActiveFeature(feature ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveFeature(null);
    const { active, over } = event;
    if (!over || !onMove) return;

    const feature = active.data.current?.feature as Feature | undefined;
    if (!feature) return;

    const targetColumnId = over.id as string;
    const allowed = ALLOWED_MOVES[feature.status] ?? [];
    if (!allowed.includes(targetColumnId)) return;

    if (targetColumnId === COLUMN_ID_IN_PROGRESS || targetColumnId === COLUMN_ID_REVIEW) {
      onMove(feature.id, targetColumnId);
    }
  };

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full min-h-[500px]">
        {columns.map((col) => {
          const colFeatures = getFeaturesForColumn(col.statuses);

          return (
            <FeatureKanbanColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              features={colFeatures}
              activeFeatureId={activeFeature?.id}
              onApprove={onApprove}
              onReject={onReject}
            />
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeFeature ? (
          <FeatureCard feature={activeFeature} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
