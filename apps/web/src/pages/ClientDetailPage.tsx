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
import { InitiativeForm } from "@/components/initiatives/InitiativeForm";

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId!);
  const [open, setOpen] = useState(false);

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

        <Dialog open={open} onOpenChange={setOpen}>
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
                    setOpen(false);
                    navigate(`/clients/${clientId}/initiatives/${initiative.id}`);
                }}
                onCancel={() => setOpen(false)}
            />
            
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Iniciativas Activas</h2>
            <span className="text-sm text-muted-foreground">{client.initiatives.length} iniciativas</span>
        </div>

        {client.initiatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No hay iniciativas aún</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-sm">
                Las iniciativas son proyectos o requerimientos que serán procesados por la IA.
                </p>
                <Button variant="outline" onClick={() => setOpen(true)}>Crear la primera</Button>
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
                            <CardTitle className="text-lg font-semibold leading-tight">{initiative.title}</CardTitle>
                            <StatusBadge status={initiative.status} />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                         {/* Description removed as per user request */}
                    </CardContent>
                    </Card>
                </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
