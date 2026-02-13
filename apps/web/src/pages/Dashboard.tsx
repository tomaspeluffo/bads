import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Clock, CheckCircle, AlertCircle, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  // Mock data for now - in a real app this would come from an API
  const stats = [
    { title: "Iniciativas Activas", value: "12", change: "+2 desde la semana pasada", icon: Activity, color: "text-blue-500" },
    { title: "Pendientes de Revisión", value: "4", change: "Requiere atención", icon: AlertCircle, color: "text-orange-500" },
    { title: "Completadas", value: "28", change: "+5 este mes", icon: CheckCircle, color: "text-green-500" },
    { title: "Tiempo Promedio", value: "3.2 días", change: "-12% vs mes anterior", icon: Clock, color: "text-purple-500" },
  ];

  const recentActivity = [
    { id: 1, user: "Ana García", action: "creó la iniciativa", target: "Sistema de Pagos", time: "Hace 2 horas" },
    { id: 2, user: "Sistema", action: "completó el plan para", target: "Migración de Base de Datos", time: "Hace 4 horas" },
    { id: 3, user: "Carlos López", action: "aprobó el feature", target: "Autenticación OAuth", time: "Hace 5 horas" },
    { id: 4, user: "Sistema", action: "requiere información para", target: "API de Integración", time: "Hace 1 día" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">resumen de actividad y métricas clave.</p>
        </div>
        <div className="flex gap-2">
            <Button>
                <FileText className="mr-2 h-4 w-4" />
                Reporte Mensual
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Main Chart Area (Placeholder) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Ejecución</CardTitle>
            <CardDescription>
                Tokens consumidos y tareas completadas en los últimos 30 días.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
                <p className="text-muted-foreground text-sm">Gráfico de actividad de agentes (Próximamente)</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimos eventos en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      <span className="font-semibold">{item.user}</span> {item.action} <span className="text-primary">{item.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-xs" size="sm">
                Ver todo <ArrowUpRight className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
