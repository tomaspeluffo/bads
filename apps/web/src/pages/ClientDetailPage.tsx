import { useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { useClient } from "@/hooks/useClients";
import { useUploadInitiative } from "@/hooks/useInitiative";

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.md";

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId!);
  const upload = useUploadInitiative();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [solutionSketch, setSolutionSketch] = useState("");
  const [noGos, setNoGos] = useState("");
  const [risks, setRisks] = useState("");
  const [responsable, setResponsable] = useState("");
  const [soporte, setSoporte] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [files, setFiles] = useState<File[]>([]);

  const resetForm = () => {
    setTitle("");
    setProblem("");
    setSolutionSketch("");
    setNoGos("");
    setRisks("");
    setResponsable("");
    setSoporte("");
    setTargetRepo("");
    setBaseBranch("main");
    setFiles([]);
  };

  const handleSubmit = () => {
    upload.mutate(
      {
        title,
        problem,
        solutionSketch,
        noGos: noGos ? noGos.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        risks: risks ? risks.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        responsable,
        soporte,
        targetRepo,
        baseBranch,
        clientId,
        files: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: (initiative) => {
          setOpen(false);
          resetForm();
          navigate(`/clients/${clientId}/initiatives/${initiative.id}`);
        },
      },
    );
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

  const canSubmit = title && problem && solutionSketch && targetRepo;

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!client) {
    return <p className="text-muted-foreground">Cliente no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/clients" },
          { label: client.name },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          {client.description && (
            <p className="text-muted-foreground mt-1">{client.description}</p>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Iniciativa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Iniciativa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Sistema de notificaciones push"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem">Problema *</Label>
                <Textarea
                  id="problem"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Describir el problema que resuelve esta iniciativa..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="solution">Solucion propuesta *</Label>
                <Textarea
                  id="solution"
                  value={solutionSketch}
                  onChange={(e) => setSolutionSketch(e.target.value)}
                  placeholder="Describir a alto nivel como se resolveria..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noGos">No-gos (uno por linea)</Label>
                  <Textarea
                    id="noGos"
                    value={noGos}
                    onChange={(e) => setNoGos(e.target.value)}
                    placeholder="Cosas que NO debe hacer..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risks">Riesgos (uno por linea)</Label>
                  <Textarea
                    id="risks"
                    value={risks}
                    onChange={(e) => setRisks(e.target.value)}
                    placeholder="Riesgos identificados..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input
                    id="responsable"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soporte">Soporte</Label>
                  <Input
                    id="soporte"
                    value={soporte}
                    onChange={(e) => setSoporte(e.target.value)}
                    placeholder="Persona de soporte"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetRepo">Repositorio *</Label>
                  <Input
                    id="targetRepo"
                    value={targetRepo}
                    onChange={(e) => setTargetRepo(e.target.value)}
                    placeholder="owner/repo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseBranch">Branch base</Label>
                  <Input
                    id="baseBranch"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
              </div>

              {/* Archivos adjuntos */}
              <div className="space-y-2">
                <Label>Documentos de contexto</Label>
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
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, i) => (
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
                  PDF, Word, TXT o Markdown (max 10MB por archivo). Se extraerá el texto para darle contexto al planificador.
                </p>
              </div>

              {upload.isError && (
                <p className="text-sm text-red-600">
                  Error al crear la iniciativa. Verifica los datos e intenta de nuevo.
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || upload.isPending}
                className="w-full"
              >
                {upload.isPending ? "Creando..." : "Crear Iniciativa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="text-xl font-semibold">Iniciativas</h2>

      {client.initiatives.length === 0 && (
        <p className="text-muted-foreground">
          No hay iniciativas para este cliente todavia.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {client.initiatives.map((initiative) => (
          <Link
            key={initiative.id}
            to={`/clients/${clientId}/initiatives/${initiative.id}`}
          >
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{initiative.title}</CardTitle>
                  <StatusBadge status={initiative.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Creada el {new Date(initiative.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
