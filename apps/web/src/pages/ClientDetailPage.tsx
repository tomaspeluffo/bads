import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { usePitchesByClient } from "@/hooks/usePitches";
import { InitiativeForm } from "@/components/initiatives/InitiativeForm";
import { PitchForm } from "@/components/pitches/PitchForm";

type TabId = "initiatives" | "pitches";

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId!);
  const { data: pitchesData } = usePitchesByClient(clientId!);
  const [activeTab, setActiveTab] = useState<TabId>("initiatives");
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);

  const pitches = pitchesData?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return <p className="text-muted-foreground p-8">Cliente no encontrado.</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <Breadcrumbs
            items={[
              { label: "Clientes", href: "/clients" },
              { label: client.name },
            ]}
          />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            {client.description && (
              <p className="text-muted-foreground text-lg">{client.description}</p>
            )}
          </div>
        </div>

        {activeTab === "initiatives" ? (
          <Dialog open={initiativeOpen} onOpenChange={setInitiativeOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="mr-2 h-5 w-5" />
                Nueva Iniciativa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80vw] max-w-[95vw] w-full h-[800px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl">Nueva Iniciativa</DialogTitle>
              </DialogHeader>
              <InitiativeForm
                clientId={clientId!}
                onSuccess={(initiative) => {
                  setInitiativeOpen(false);
                  navigate(`/clients/${clientId}/initiatives/${initiative.id}`);
                }}
                onCancel={() => setInitiativeOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={pitchOpen} onOpenChange={setPitchOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Pitch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-w-[95vw] w-full">
              <DialogHeader>
                <DialogTitle className="text-2xl">Nuevo Pitch</DialogTitle>
              </DialogHeader>
              <PitchForm
                clientId={clientId!}
                onSuccess={(pitch) => {
                  setPitchOpen(false);
                  navigate(`/clients/${clientId}/pitches/${pitch.id}`);
                }}
                onCancel={() => setPitchOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-6">
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "initiatives"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("initiatives")}
          >
            Iniciativas
            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {client.initiatives.length}
            </span>
          </button>
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "pitches"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pitches")}
          >
            Pitches
            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {pitches.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Initiatives tab */}
      {activeTab === "initiatives" && (
        <div className="space-y-4">
          {client.initiatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No hay iniciativas aún</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-sm">
                Las iniciativas son proyectos o requerimientos que serán procesados por la IA.
              </p>
              <Button variant="outline" onClick={() => setInitiativeOpen(true)}>
                Crear la primera
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {client.initiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  to={`/clients/${clientId}/initiatives/${initiative.id}`}
                  className="block group"
                >
                  <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-lg font-semibold leading-tight">
                          {initiative.title}
                        </CardTitle>
                        <StatusBadge status={initiative.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pitches tab */}
      {activeTab === "pitches" && (
        <div className="space-y-4">
          {pitches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No hay pitches aún</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-sm">
                Los pitches son propuestas comerciales generadas por IA a partir de un brief del cliente.
              </p>
              <Button variant="outline" onClick={() => setPitchOpen(true)}>
                Crear el primero
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pitches.map((pitch) => (
                <Link
                  key={pitch.id}
                  to={`/clients/${clientId}/pitches/${pitch.id}`}
                  className="block group"
                >
                  <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-lg font-semibold leading-tight">
                          {pitch.title}
                        </CardTitle>
                        <StatusBadge status={pitch.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(pitch.created_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
