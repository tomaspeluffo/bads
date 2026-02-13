import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Paperclip, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { FeatureCard } from "@/components/FeatureCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { FeatureKanbanBoard } from "@/components/kanban/FeatureKanbanBoard";
import { RepoSelector } from "@/components/RepoSelector";
import {
  useInitiativeDetail,
  useQuestions,
  useReplan,
  useReuploadInitiative,
  useApproveFeature,
  useRejectFeature,
  useMoveFeature,
  useDeleteInitiative,
  useUpdateRepo,
} from "@/hooks/useInitiative";
import { useClient } from "@/hooks/useClients";

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.md";

export function InitiativeDetailPage() {
  const { clientId, initiativeId } = useParams<{
    clientId: string;
    initiativeId: string;
  }>();
  const navigate = useNavigate();
  const { data: client } = useClient(clientId!);
  const { data: initiative, isLoading } = useInitiativeDetail(initiativeId!);
  const { data: questionsData } = useQuestions(initiativeId!);
  const replan = useReplan(initiativeId!);
  const reupload = useReuploadInitiative(initiativeId!);
  const approve = useApproveFeature(initiativeId!);
  const reject = useRejectFeature(initiativeId!);
  const move = useMoveFeature(initiativeId!);
  const deleteInit = useDeleteInitiative();
  const updateRepo = useUpdateRepo(initiativeId!);
  const [answer, setAnswer] = useState("");
  const [replanFiles, setReplanFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [reuploadForm, setReuploadForm] = useState({
    title: "",
    problem: "",
    solutionSketch: "",
    successCriteria: "",
    techStack: "",
    responsable: "",
    soporte: "",
    noGos: "",
    risks: "",
    additionalNotes: "",
  });
  const [reuploadFiles, setReuploadFiles] = useState<File[]>([]);
  const reuploadFileInputRef = useRef<HTMLInputElement>(null);

  // Repo form state
  const [repoInput, setRepoInput] = useState("");
  const [branchInput, setBranchInput] = useState("main");

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!initiative) {
    return <p className="text-muted-foreground">Iniciativa no encontrada.</p>;
  }

  const metadata = initiative.metadata as Record<string, unknown> | null;
  const hasRepo = !!(metadata?.targetRepo);

  const handleSubmitAnswers = () => {
    if (answer.trim() || replanFiles.length > 0) {
      replan.mutate(
        { additionalContext: answer.trim(), files: replanFiles.length > 0 ? replanFiles : undefined },
        {
          onSuccess: () => {
            setAnswer("");
            setReplanFiles([]);
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (window.confirm("¿Estas seguro de que queres eliminar esta iniciativa? Esta accion no se puede deshacer.")) {
      deleteInit.mutate(initiativeId!, {
        onSuccess: () => navigate(`/clients/${clientId}`),
      });
    }
  };

  const handleSaveRepo = () => {
    if (repoInput.trim()) {
      updateRepo.mutate(
        { targetRepo: repoInput.trim(), baseBranch: branchInput.trim() || "main" },
        {
          onSuccess: () => {
            setRepoInput("");
            setBranchInput("main");
          },
        },
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReplanFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setReplanFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReuploadChange = (field: string, value: string) => {
    setReuploadForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReuploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReuploadFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (reuploadFileInputRef.current) reuploadFileInputRef.current.value = "";
  };

  const handleReuploadSubmit = () => {
    reupload.mutate(
      {
        ...reuploadForm,
        noGos: reuploadForm.noGos ? reuploadForm.noGos.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        risks: reuploadForm.risks ? reuploadForm.risks.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        successCriteria: reuploadForm.successCriteria || undefined,
        techStack: reuploadForm.techStack || undefined,
        additionalNotes: reuploadForm.additionalNotes || undefined,
        files: reuploadFiles.length > 0 ? reuploadFiles : undefined,
      },
      {
        onSuccess: () => {
          setReuploadOpen(false);
          setReuploadForm({
            title: "",
            problem: "",
            solutionSketch: "",
            successCriteria: "",
            techStack: "",
            responsable: "",
            soporte: "",
            noGos: "",
            risks: "",
            additionalNotes: "",
          });
          setReuploadFiles([]);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/clients" },
          { label: client?.name ?? "Cliente", href: `/clients/${clientId}` },
          { label: initiative.title },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{initiative.title}</h1>
          {initiative.error_message && (
            <p className="text-sm text-red-600 mt-1">{initiative.error_message}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={initiative.status} />
          {["failed", "planning", "planned"].includes(initiative.status) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => replan.mutate({ additionalContext: "" })}
                disabled={replan.isPending}
                title="Reintentar planificación"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${replan.isPending ? "animate-spin" : ""}`} />
                {replan.isPending ? "Replanificando..." : "Replanificar"}
              </Button>
              <Dialog open={reuploadOpen} onOpenChange={setReuploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" title="Re-subir contenido">
                    <Upload className="mr-2 h-4 w-4" />
                    Re-subir pitch
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Re-subir contenido de la iniciativa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="reupload-title">Título *</Label>
                      <Input
                        id="reupload-title"
                        value={reuploadForm.title}
                        onChange={(e) => handleReuploadChange("title", e.target.value)}
                        placeholder="Título de la iniciativa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reupload-problem">Problema a resolver *</Label>
                      <Textarea
                        id="reupload-problem"
                        value={reuploadForm.problem}
                        onChange={(e) => handleReuploadChange("problem", e.target.value)}
                        placeholder="Descripción del problema..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reupload-solution">Solución propuesta *</Label>
                      <Textarea
                        id="reupload-solution"
                        value={reuploadForm.solutionSketch}
                        onChange={(e) => handleReuploadChange("solutionSketch", e.target.value)}
                        placeholder="Solución de alto nivel..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reupload-noGos" className="text-destructive">No-gos</Label>
                        <Textarea
                          id="reupload-noGos"
                          value={reuploadForm.noGos}
                          onChange={(e) => handleReuploadChange("noGos", e.target.value)}
                          placeholder="Uno por línea..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reupload-risks">Riesgos</Label>
                        <Textarea
                          id="reupload-risks"
                          value={reuploadForm.risks}
                          onChange={(e) => handleReuploadChange("risks", e.target.value)}
                          placeholder="Uno por línea..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reupload-techStack">Stack tecnológico</Label>
                      <Textarea
                        id="reupload-techStack"
                        value={reuploadForm.techStack}
                        onChange={(e) => handleReuploadChange("techStack", e.target.value)}
                        placeholder="React, Node.js..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reupload-notes">Notas adicionales</Label>
                      <Textarea
                        id="reupload-notes"
                        value={reuploadForm.additionalNotes}
                        onChange={(e) => handleReuploadChange("additionalNotes", e.target.value)}
                        placeholder="Contexto adicional..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={reuploadFileInputRef}
                        type="file"
                        accept={ACCEPTED_FILE_TYPES}
                        multiple
                        onChange={handleReuploadFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reuploadFileInputRef.current?.click()}
                      >
                        <Paperclip className="mr-2 h-4 w-4" />
                        Adjuntar archivos
                      </Button>
                      {reuploadFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {reuploadFiles.map((file, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                            >
                              {file.name}
                              <button
                                type="button"
                                onClick={() => setReuploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {reupload.isError && (
                      <p className="text-sm text-destructive">Error al re-subir contenido.</p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setReuploadOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleReuploadSubmit}
                        disabled={!reuploadForm.title || !reuploadForm.problem || !reuploadForm.solutionSketch || reupload.isPending}
                      >
                        {reupload.isPending ? "Enviando..." : "Re-subir y replanificar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteInit.isPending}
            title="Eliminar iniciativa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerta de repo faltante */}
      {!hasRepo && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Repositorio no configurado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Esta iniciativa no tiene un repositorio GitHub asociado. La planificacion puede continuar, pero para ejecutar las tareas vas a necesitar configurar el repo.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Repositorio</Label>
                <RepoSelector
                  value={repoInput}
                  onChange={(repo, defaultBranch) => {
                    setRepoInput(repo);
                    if (defaultBranch) setBranchInput(defaultBranch);
                  }}
                />
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor="branchInput" className="text-xs">Branch</Label>
                <Input
                  id="branchInput"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder="main"
                />
              </div>
              <Button
                onClick={handleSaveRepo}
                disabled={!repoInput.trim() || updateRepo.isPending}
              >
                {updateRepo.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            {updateRepo.isError && (
              <p className="text-sm text-red-600">Error al guardar el repositorio.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repo info (cuando ya esta configurado) */}
      {hasRepo && (
        <p className="text-sm text-muted-foreground">
          Repositorio: <span className="font-mono">{metadata?.targetRepo as string}</span>
          {metadata?.baseBranch ? <> (branch: <span className="font-mono">{String(metadata.baseBranch)}</span>)</> : null}
        </p>
      )}

      {/* Resumen del plan */}
      {initiative.plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descripción de la Iniciativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {(initiative.raw_content as any)?.problem || (initiative.raw_content as any)?.description || "Sin descripción disponible."}
              </p>
              <p className="text-xs text-muted-foreground">
                {initiative.plan.feature_count} features
              </p>
            </CardContent>
          </Card>
          <Separator />
        </>
      )}

      {/* Seccion de preguntas */}
      {initiative.status === "needs_info" &&
        questionsData &&
        questionsData.questions.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preguntas del planificador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionsData.analysis && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {questionsData.analysis}
                  </p>
                )}
                <ul className="space-y-3">
                  {questionsData.questions.map((q, i) => {
                    const question = typeof q === "string" ? q : (q as { question: string; why?: string; category?: string });
                    const text = typeof question === "string" ? question : question.question;
                    const why = typeof question === "string" ? null : question.why;
                    return (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="font-semibold text-muted-foreground shrink-0">
                          {i + 1}.
                        </span>
                        <div>
                          <p>{text}</p>
                          {why && <p className="text-xs text-muted-foreground mt-1">{why}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-3 pt-2">
                  <Textarea
                    placeholder="Escribi tus respuestas o contexto adicional..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={4}
                  />

                  {/* Archivos adjuntos */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Adjuntar archivo
                    </Button>
                    {replanFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {replanFiles.map((file, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                          >
                            {file.name}
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, TXT o Markdown (max 10MB por archivo)
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmitAnswers}
                    disabled={(!answer.trim() && replanFiles.length === 0) || replan.isPending}
                  >
                    {replan.isPending ? "Enviando..." : "Enviar y replanificar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Separator />
          </>
        )}

      {/* Lista de features */}
      {initiative.features.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Features</h2>
          {!hasRepo && (
            <p className="text-sm text-yellow-600">
              Configura el repositorio para poder aprobar o rechazar features.
            </p>
          )}
          <div className="mt-4">
             <FeatureKanbanBoard
              features={initiative.features}
              onApprove={(fid) => approve.mutate(fid)}
              onReject={(fid, feedback) => reject.mutate({ featureId: fid, feedback })}
              onMove={(fid, targetColumn) => move.mutate({ featureId: fid, targetColumn })}
             />
          </div>
          <Separator />
        </>
      )}

      {/* Tablero Kanban */}
      {initiative.features.some((f) => f.tasks.length > 0) && (
        <>
          <h2 className="text-xl font-semibold">Tablero de tareas</h2>
          <KanbanBoard features={initiative.features} />
        </>
      )}
    </div>
  );
}
