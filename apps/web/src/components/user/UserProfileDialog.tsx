import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConnectGitHub, useDisconnectGitHub } from "@/hooks/useGitHub";

interface UserProfileDialogProps {
  children: React.ReactNode;
}

export function UserProfileDialog({ children }: UserProfileDialogProps) {
  const { user, signOut } = useAuth();
  const connectGitHub = useConnectGitHub();
  const disconnectGitHub = useDisconnectGitHub();

  if (!user) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Perfil de Usuario</DialogTitle>
          <DialogDescription>
            Gestiona tu cuenta y conexiones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} alt={user.email} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <h3 className="font-medium leading-none">{user.email?.split('@')[0]}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 w-fit mt-1">
                Admin
              </span>
            </div>
          </div>

          <Separator />

          {/* Integrations */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium leading-none">Integraciones</h4>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-full">
                    <Github className="h-5 w-5" />
                </div>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">GitHub</p>
                  <p className="text-xs text-muted-foreground">
                    {user.github_connected
                      ? `Conectado como @${user.github_username}`
                      : "No conectado"}
                  </p>
                </div>
              </div>
              {user.github_connected ? (
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => disconnectGitHub.mutate()}
                    disabled={disconnectGitHub.isPending}
                >
                  {disconnectGitHub.isPending ? "Desconectando..." : "Desconectar"}
                </Button>
              ) : (
                <Button 
                    size="sm"
                    onClick={() => connectGitHub.mutate()}
                    disabled={connectGitHub.isPending}
                >
                  {connectGitHub.isPending ? "Conectando..." : "Conectar"}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <Button variant="destructive" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
