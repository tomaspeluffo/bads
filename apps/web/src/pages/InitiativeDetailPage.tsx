import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { FeatureCard } from "@/components/FeatureCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import {
  useInitiativeDetail,
  useQuestions,
  useReplan,
  useApproveFeature,
  useRejectFeature,
  useDeleteInitiative,
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
  const approve = useApproveFeature(initiativeId!);
  const reject = useRejectFeature(initiativeId!);
  const deleteInit = useDeleteInitiative();
  const [answer, setAnswer] = useState("");
  const [replanFiles, setReplanFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!initiative) {
    return <p className="text-muted-foreground">Iniciativa no encontrada.</p>;
  }

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
    if (window.confirm("¿Estás seguro de que querés eliminar esta iniciativa? Esta acción no se puede deshacer.")) {
      deleteInit.mutate(initiativeId!, {
        onSuccess: () => navigate(`/clients/${clientId}`),
      });
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

      {/* Resumen del plan */}
      {initiative.plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan v{initiative.plan.version}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {initiative.plan.summary}
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
          <div className="grid gap-4 lg:grid-cols-2">
            {initiative.features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onApprove={(fid) => approve.mutate(fid)}
                onReject={(fid, feedback) => reject.mutate({ featureId: fid, feedback })}
              />
            ))}
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
