import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { Task, TaskStatus } from "@/types";

const statusDot: Record<string, string> = {
  to_do: "bg-gray-400",
  done: "bg-green-400",
  failed: "bg-red-400",
};

const selectableStatuses: { value: TaskStatus; label: string }[] = [
  { value: "to_do", label: "To Do" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
];

const statusSelectStyles: Record<string, string> = {
  to_do: "bg-gray-100 text-gray-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

interface KanbanCardProps {
  task: Task;
  featureName: string;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

export function KanbanCard({ task, featureName, onStatusChange }: KanbanCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.prompt) return;
    try {
      await navigator.clipboard.writeText(task.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onStatusChange) return;
    onStatusChange(task.id, e.target.value as TaskStatus);
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot[task.status] ?? "bg-gray-400"}`}
        />
        <span className="text-sm font-medium leading-tight flex-1 break-words min-w-0">{task.title}</span>
        {task.prompt && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCopy}
            title={copied ? "Copiado!" : "Copiar prompt"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {task.task_type}
        </Badge>
        <select
          value={task.status}
          onChange={handleStatusChange}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 cursor-pointer outline-none ${statusSelectStyles[task.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {selectableStatuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {task.prompt && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Ocultar prompt" : "Ver prompt"}
          </button>
          <CollapsibleContent>
            <pre className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto overflow-x-hidden">
              {task.prompt}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
