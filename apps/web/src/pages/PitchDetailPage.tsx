import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { usePitch, useConvertPitchToInitiative, useDeletePitch } from "@/hooks/usePitches";
import type { PitchContent } from "@/types";

interface SectionProps {
  title: string;
  value: string | string[];
  defaultOpen?: boolean;
}

function PitchSection({ title, value, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

  if (isEmpty) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
          {Array.isArray(value) ? (
            <ul className="mt-3 space-y-1">
              {value.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm whitespace-pre-wrap">{value}</p>
          )}
        </div>
      )}
    </div>
  );
}

function renderSections(content: PitchContent) {
  return (
    <div className="space-y-2">
      <PitchSection title="Resumen Ejecutivo" value={content.executive_summary} defaultOpen={true} />
      <PitchSection title="Problema" value={content.problema} />
      <PitchSection title="Solución" value={content.solucion} />
      <PitchSection title="Enfoque Técnico" value={content.enfoque_tecnico} />
      <PitchSection title="Entregables" value={content.entregables} />
      <PitchSection title="Métricas de Éxito" value={content.metricas_de_exito} />
      <PitchSection title="Riesgos" value={content.riesgos} />
      <PitchSection title="Próximos Pasos" value={content.proximos_pasos} />
    </div>
  );
}

export function PitchDetailPage() {
  const { clientId, pitchId } = useParams<{ clientId: string; pitchId: string }>();
  const navigate = useNavigate();
  const { data: pitch, isLoading } = usePitch(pitchId!);
  const convert = useConvertPitchToInitiative(clientId!);
  const deleteMutation = useDeletePitch(clientId!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pitch) {
    return <p className="text-muted-foreground p-8">Pitch no encontrado.</p>;
  }

  const handleConvert = () => {
    convert.mutate(pitchId!, {
      onSuccess: ({ initiativeId }) => {
        navigate(`/clients/${clientId}/initiatives/${initiativeId}`);
      },
    });
  };

  const handleDelete = () => {
    if (!confirm("¿Estás seguro de que querés eliminar este pitch?")) return;
    deleteMutation.mutate(pitchId!, {
      onSuccess: () => navigate(`/clients/${clientId}`),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <Breadcrumbs
            items={[
              { label: "Clientes", href: "/clients" },
              { label: pitch.client_name, href: `/clients/${clientId}` },
              { label: pitch.title },
            ]}
          />
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{pitch.title}</h1>
            <StatusBadge status={pitch.status} />
          </div>
        </div>

        <div className="flex gap-2">
          {pitch.status === "ready" && (
            <Button onClick={handleConvert} disabled={convert.isPending}>
              Crear Iniciativa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {pitch.status === "converted" && pitch.initiative_id && (
            <Button variant="outline" asChild>
              <Link to={`/clients/${clientId}/initiatives/${pitch.initiative_id}`}>
                Ver Iniciativa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          {pitch.status !== "converted" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {(pitch.status === "pending" || pitch.status === "generating") && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground font-medium">Generando propuesta comercial...</p>
            <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
          </CardContent>
        </Card>
      )}

      {pitch.status === "failed" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error al generar el pitch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {pitch.error_message ?? "Ocurrió un error inesperado."}
            </p>
          </CardContent>
        </Card>
      )}

      {pitch.status === "converted" && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-indigo-700">
              Este pitch fue convertido en una iniciativa.
            </p>
          </CardContent>
        </Card>
      )}

      {pitch.content && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Propuesta Comercial</h2>
          {renderSections(pitch.content)}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">Brief Original</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{pitch.brief}</p>
        </CardContent>
      </Card>
    </div>
  );
}
