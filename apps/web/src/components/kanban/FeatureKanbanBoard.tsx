import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { FeatureKanbanColumn } from "./FeatureKanbanColumn";
import { FeatureCard } from "@/components/FeatureCard";
import type { Feature, FeatureStatus, TaskStatus } from "@/types";

interface FeatureKanbanBoardProps {
  features: Feature[];
  onDecompose?: (featureId: string) => void;
  onTaskStatusChange?: (taskId: string, featureId: string, status: TaskStatus) => void;
}

const columns: { id: string; title: string; statuses: FeatureStatus[] }[] = [
  {
    id: "backlog",
    title: "Backlog",
    statuses: ["pending"],
  },
  {
    id: "decomposing",
    title: "Descomponiendo",
    statuses: ["decomposing"],
  },
  {
    id: "ready",
    title: "Listo",
    statuses: ["decomposed"],
  },
  {
    id: "failed",
    title: "Fallido",
    statuses: ["failed"],
  },
];

export function FeatureKanbanBoard({ features, onDecompose, onTaskStatusChange }: FeatureKanbanBoardProps) {
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
    if (!over || !onDecompose) return;

    const feature = active.data.current?.feature as Feature | undefined;
    if (!feature) return;

    // Solo permitir mover de pending a decomposing
    if (feature.status === "pending" && over.id === "decomposing") {
      onDecompose(feature.id);
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
              onTaskStatusChange={onTaskStatusChange}
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
