import { useState, useRef } from "react";
import { Plus, Paperclip, AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUploadInitiative } from "@/hooks/useInitiative";
import { RepoSelector } from "@/components/RepoSelector";

interface InitiativeFormProps {
  clientId: string;
  onSuccess: (initiative: any) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: "Información General" },
  { id: 2, title: "Detalles Técnicos" },
  { id: 3, title: "Riesgos y Archivos" },
];

export function InitiativeForm({ clientId, onSuccess, onCancel }: InitiativeFormProps) {
  const [step, setStep] = useState(1);
  const upload = useUploadInitiative();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    problem: "",
    solutionSketch: "",
    successCriteria: "",
    techStack: "",
    targetRepo: "",
    baseBranch: "main",
    noGos: "",
    risks: "",
    additionalNotes: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      return formData.title && formData.problem && formData.solutionSketch;
    }
    return true;
  };

  const handleSubmit = () => {
    upload.mutate(
      {
        title: formData.title,
        problem: formData.problem,
        solutionSketch: formData.solutionSketch,
        noGos: formData.noGos ? formData.noGos.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        risks: formData.risks ? formData.risks.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        successCriteria: formData.successCriteria || undefined,
        techStack: formData.techStack || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        targetRepo: formData.targetRepo || undefined,
        baseBranch: formData.baseBranch,
        clientId,
        files: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: (data) => onSuccess(data),
      }
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10" />
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-1 space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="title">Título de la Iniciativa *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Ej: Sistema de notificaciones push"
                className="text-lg font-medium"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="problem">Problema a resolver *</Label>
              <Textarea
                id="problem"
                value={formData.problem}
                onChange={(e) => handleChange("problem", e.target.value)}
                placeholder="Descripción detallada del problema..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solution">Solución Propuesta *</Label>
              <Textarea
                id="solution"
                value={formData.solutionSketch}
                onChange={(e) => handleChange("solutionSketch", e.target.value)}
                placeholder="Descripción de alto nivel de la solución..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="successCriteria">Criterios de Éxito / KPIs</Label>
              <Textarea
                id="successCriteria"
                value={formData.successCriteria}
                onChange={(e) => handleChange("successCriteria", e.target.value)}
                placeholder="¿Cómo mediremos el éxito?..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="techStack">Stack Tecnológico</Label>
              <Textarea
                id="techStack"
                value={formData.techStack}
                onChange={(e) => handleChange("techStack", e.target.value)}
                placeholder="React, Node.js, PostgreSQL..."
                rows={2}
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Repositorio GitHub</Label>
                  <RepoSelector
                    value={formData.targetRepo}
                    onChange={(repo, defaultBranch) => {
                      handleChange("targetRepo", repo);
                      if (defaultBranch) handleChange("baseBranch", defaultBranch);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseBranch">Branch Base</Label>
                  <Input
                    id="baseBranch"
                    value={formData.baseBranch}
                    onChange={(e) => handleChange("baseBranch", e.target.value)}
                    placeholder="main"
                  />
                </div>
              </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noGos" className="text-destructive">No-gos (Riesgos críticos)</Label>
                <Textarea
                  id="noGos"
                  value={formData.noGos}
                  onChange={(e) => handleChange("noGos", e.target.value)}
                  placeholder="Lo que NO se debe hacer..."
                  rows={3}
                  className="border-destructive/30 focus-visible:ring-destructive/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risks">Otros Riesgos</Label>
                <Textarea
                  id="risks"
                  value={formData.risks}
                  onChange={(e) => handleChange("risks", e.target.value)}
                  placeholder="Riesgos potenciales..."
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Notas Adicionales</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleChange("additionalNotes", e.target.value)}
                placeholder="Cualquier otro contexto relevante..."
                rows={3}
              />
            </div>

            <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-dashed">
                <div className="flex items-center justify-between">
                    <Label>Documentos de Contexto</Label>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        >
                        <Paperclip className="mr-2 h-4 w-4" />
                        Adjuntar
                    </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {files.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-xs"
                      >
                        {file.name}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                        Puedes adjuntar PDFs, Docs o archivos de texto para dar contexto a la IA.
                    </p>
                )}
            </div>
          </div>
        )}
        
        {upload.isError && (
             <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                Error al crear la iniciativa. Por favor verifica los datos.
             </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          {step === 1 ? "Cancelar" : "Atrás"}
        </Button>

        {step < 3 ? (
          <Button 
            onClick={() => setStep(step + 1)}
            disabled={!validateStep(step)}
            className="w-32"
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={upload.isPending}
            className="w-32"
          >
            {upload.isPending ? "Creando..." : "Crear"}
          </Button>
        )}
      </div>
    </div>
  );
}
