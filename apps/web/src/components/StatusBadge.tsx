import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Initiative statuses
  pending: "bg-gray-100 text-gray-700",
  planning: "bg-blue-100 text-blue-700",
  needs_info: "bg-yellow-100 text-yellow-700",
  planned: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",

  // Feature statuses
  decomposing: "bg-blue-100 text-blue-700",
  decomposed: "bg-green-100 text-green-700",
  developing: "bg-blue-100 text-blue-700",
  qa_review: "bg-purple-100 text-purple-700",
  human_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  merging: "bg-indigo-100 text-indigo-700",
  merged: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",

  // Task statuses
  to_do: "bg-gray-100 text-gray-700",
  doing: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  needs_info: "Needs Info",
  in_progress: "In Progress",
  qa_review: "QA Review",
  decomposed: "Listo",
  human_review: "Human Review",
  to_do: "To Do",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "bg-gray-100 text-gray-700";
  const label = statusLabels[status] ?? status.replace(/_/g, " ");

  return (
    <Badge variant="outline" className={cn("capitalize border-0", color)}>
      {label}
    </Badge>
  );
}
