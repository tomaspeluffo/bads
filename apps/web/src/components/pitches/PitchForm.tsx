import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePitch } from "@/hooks/usePitches";
import type { Pitch } from "@/types";

interface PitchFormProps {
  clientId: string;
  onSuccess: (pitch: Pitch) => void;
  onCancel: () => void;
}

export function PitchForm({ clientId, onSuccess, onCancel }: PitchFormProps) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const createPitch = useCreatePitch(clientId);

  const isValid = title.trim().length > 0 && brief.trim().length >= 10;

  const handleSubmit = () => {
    createPitch.mutate(
      { title: title.trim(), brief: brief.trim(), clientId },
      { onSuccess: (pitch) => onSuccess(pitch) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-y-auto space-y-4 max-h-[60vh] pr-1">
        <div className="space-y-2">
          <Label htmlFor="pitch-title">Nombre del Proyecto *</Label>
          <Input
            id="pitch-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Sistema de gestión de inventario"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pitch-brief">Brief del Cliente *</Label>
          <Textarea
            id="pitch-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describí el problema o necesidad del cliente, el contexto del negocio y cualquier detalle relevante para la propuesta..."
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">Mínimo 10 caracteres</p>
        </div>

        {createPitch.isError && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Error al crear el pitch. Por favor verificá los datos.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" onClick={onCancel} disabled={createPitch.isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || createPitch.isPending}>
          {createPitch.isPending ? "Generando..." : "Generar Pitch"}
        </Button>
      </div>
    </div>
  );
}
