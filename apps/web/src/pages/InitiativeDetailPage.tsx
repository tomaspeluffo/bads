import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Paperclip, AlertTriangle, RefreshCw, Upload, MessageSquare, ChevronDown, ChevronRight, Send } from "lucide-react";
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
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { FeatureKanbanBoard } from "@/components/kanban/FeatureKanbanBoard";
import { RepoSelector } from "@/components/RepoSelector";
import {
  useInitiativeDetail,
  useQuestions,
  useReplan,
  useReuploadInitiative,
  useDecomposeFeature,
  useUpdateTaskStatus,
  useDeleteInitiative,
  useUpdateRepo,
  usePlanChat,
  useApprovePlan,
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
  const decompose = useDecomposeFeature(initiativeId!);
  const updateTaskStatus = useUpdateTaskStatus(initiativeId!);
  const deleteInit = useDeleteInitiative();
  const updateRepo = useUpdateRepo(initiativeId!);
  const planChat = usePlanChat(initiativeId!);
  const approvePlanMutation = useApprovePlan(initiativeId!);
  const [activeTab, setActiveTab] = useState<"plan" | "features" | "tasks">("plan");
  const [answer, setAnswer] = useState("");
  const [replanFiles, setReplanFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

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
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={initiative.status} />
          {["failed", "planning", "planned", "plan_review"].includes(initiative.status) && (
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

      {/* Tabs: Plan / Features / Tareas */}
      {(initiative.plan !== null || initiative.features.length > 0) && (
        <>
          {!hasRepo && initiative.features.length > 0 && (
            <p className="text-sm text-yellow-600">
              Configura el repositorio para poder descomponer features.
            </p>
          )}
          <div className="flex gap-1 border-b">
            {initiative.plan && (
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "plan"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("plan")}
              >
                Plan
              </button>
            )}
            {initiative.features.length > 0 && (
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "features"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("features")}
              >
                Features
              </button>
            )}
            {initiative.features.some((f) => f.tasks.length > 0) && (
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "tasks"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("tasks")}
              >
                Tareas
              </button>
            )}
          </div>

          <div className="mt-4">
            {/* ── Plan tab ── */}
            {activeTab === "plan" && initiative.plan && (() => {
              type RawPlanFeature = {
                title: string;
                description: string;
                acceptanceCriteria?: string[];
                userStory?: string;
                developerContext?: string;
                estimatedComplexity?: "low" | "medium" | "high";
              };
              const rawFeatures = (
                initiative.plan.raw_output as { features?: RawPlanFeature[] } | null
              )?.features ?? [];

              const sendChat = () => {
                const userMsg = chatInput.trim();
                if (!userMsg || planChat.isPending) return;
                const newHistory = [...chatMessages, { role: "user" as const, content: userMsg }];
                setChatMessages(newHistory);
                setChatInput("");
                planChat.mutate(
                  { message: userMsg, history: chatMessages },
                  {
                    onSuccess: (data) => {
                      setChatMessages([...newHistory, { role: "assistant" as const, content: data.response }]);
                    },
                    onError: () => {
                      setChatMessages([...newHistory, { role: "assistant" as const, content: "Error al procesar la consulta. Intentá nuevamente." }]);
                    },
                  },
                );
              };

              return (
                <div className="space-y-4">
                  {/* Approve banner */}
                  {initiative.status === "plan_review" && (
                    <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="pt-4 flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          El plan está listo. Revisalo y aprobalo para que se creen las features y puedas empezar el desarrollo.
                        </p>
                        <Button
                          onClick={() => approvePlanMutation.mutate()}
                          disabled={approvePlanMutation.isPending}
                        >
                          {approvePlanMutation.isPending ? "Aprobando..." : "Aprobar plan"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Plan header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        v{initiative.plan.version}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {initiative.plan.summary}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Consultar al planificador
                    </Button>
                  </div>

                  {/* Features accordion */}
                  {rawFeatures.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Features del plan
                      </p>
                      {rawFeatures.map((rf, i) => {
                        const featureKey = `raw-${i}`;
                        const isExpanded = !!expandedFeatures[featureKey];
                        const complexity = rf.estimatedComplexity;
                        return (
                          <div key={featureKey} className="border rounded-md overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                setExpandedFeatures((prev) => ({
                                  ...prev,
                                  [featureKey]: !prev[featureKey],
                                }))
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium flex-1">
                                {i + 1}. {rf.title}
                              </span>
                              {complexity && (
                                <span
                                  title="Complejidad estimada"
                                  className={`text-xs px-2 py-0.5 rounded font-medium text-white ${
                                    complexity === "low"
                                      ? "bg-emerald-600"
                                      : complexity === "medium"
                                        ? "bg-amber-500"
                                        : "bg-red-600"
                                  }`}
                                >
                                  {complexity === "low" ? "baja" : complexity === "medium" ? "media" : "alta"}
                                </span>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-1 space-y-3 border-t bg-muted/20">
                                <p className="text-sm text-muted-foreground">{rf.description}</p>
                                {rf.userStory && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">User story</p>
                                    <p className="text-sm italic">{rf.userStory}</p>
                                  </div>
                                )}
                                {rf.acceptanceCriteria && rf.acceptanceCriteria.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Criterios de aceptación</p>
                                    <ul className="space-y-0.5">
                                      {rf.acceptanceCriteria.map((c, ci) => (
                                        <li key={ci} className="text-sm flex gap-1.5">
                                          <span className="text-muted-foreground">☐</span>
                                          <span>{c}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {rf.developerContext && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Contexto técnico</p>
                                    <p className="text-sm text-muted-foreground">{rf.developerContext}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Chat dialog */}
                  <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                    <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Consultar al planificador</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0" style={{ maxHeight: "400px" }}>
                        {chatMessages.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Preguntá sobre las decisiones técnicas del plan o sugerí cambios.
                          </p>
                        )}
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {planChat.isPending && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                              Pensando...
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 pt-2 border-t">
                        {chatMessages.some((m) => m.role === "assistant") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => {
                              const lastAssistant = [...chatMessages].reverse().find((m) => m.role === "assistant");
                              if (lastAssistant) {
                                replan.mutate(
                                  { additionalContext: lastAssistant.content },
                                  { onSuccess: () => setChatOpen(false) },
                                );
                              }
                            }}
                            disabled={replan.isPending}
                          >
                            {replan.isPending ? "Replanificando..." : "Usar última respuesta como contexto para replanificar"}
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Escribí tu pregunta..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            rows={2}
                            className="resize-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendChat();
                              }
                            }}
                          />
                          <Button size="icon" disabled={!chatInput.trim() || planChat.isPending} onClick={sendChat}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva línea</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })()}

            {/* ── Features tab ── */}
            {activeTab === "features" && (
              <FeatureKanbanBoard
                features={initiative.features}
                onDecompose={(fid) => decompose.mutate(fid)}
                onTaskStatusChange={(taskId, featureId, status) =>
                  updateTaskStatus.mutate({ featureId, taskId, status })
                }
              />
            )}

            {/* ── Tasks tab ── */}
            {activeTab === "tasks" && (
              <KanbanBoard
                features={initiative.features}
                onTaskStatusChange={(taskId, featureId, status) =>
                  updateTaskStatus.mutate({ featureId, taskId, status })
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
