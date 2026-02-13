import { useState } from "react";
import { Github, Plus, Search, Check, ChevronsUpDown, Loader2, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGitHubStatus, useGitHubRepos, useConnectGitHub, useCreateGitHubRepo } from "@/hooks/useGitHub";

interface RepoSelectorProps {
  value: string;
  onChange: (repo: string, defaultBranch?: string) => void;
}

export function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const { data: user } = useGitHubStatus();
  const isConnected = !!user?.github_connected;
  const connect = useConnectGitHub();
  const { data: repos, isLoading: loadingRepos } = useGitHubRepos(isConnected);
  const createRepo = useCreateGitHubRepo();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  // State 1: GitHub not connected
  if (!isConnected) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
        >
          <Github className="h-4 w-4" />
          {connect.isPending ? "Redirigiendo..." : "Conectar GitHub"}
        </Button>
        {value && (
          <p className="text-xs text-muted-foreground">
            Repositorio actual: <span className="font-mono">{value}</span>
          </p>
        )}
      </div>
    );
  }

  const filteredRepos = repos?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const handleSelectRepo = (repoName: string, defaultBranch?: string) => {
    onChange(repoName, defaultBranch);
    setOpen(false);
    setSearch("");
  };

  const handleCreateRepo = () => {
    if (!newRepoName.trim()) return;
    createRepo.mutate(
      { name: newRepoName.trim(), isPrivate: newRepoPrivate },
      {
        onSuccess: (data) => {
          handleSelectRepo(data.full_name, data.default_branch);
          setShowCreateForm(false);
          setNewRepoName("");
          setNewRepoPrivate(false);
        },
      },
    );
  };

  if (showCreateForm) {
     return (
        <div className="rounded-md border p-4 space-y-4 bg-muted/20">
            <h4 className="text-sm font-medium">Crear nuevo repositorio</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="mi-nuevo-repo"
                  className="h-9"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Privado</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateRepo}
                  disabled={!newRepoName.trim() || createRepo.isPending}
                  className="flex-1"
                >
                  {createRepo.isPending ? "Creando..." : "Crear Repo"}
                </Button>
              </div>
               {createRepo.isError && (
                <p className="text-xs text-destructive">Error al crear el repositorio.</p>
              )}
            </div>
        </div>
     )
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
             <span className="flex items-center gap-2 truncate">
                <Github className="h-4 w-4 shrink-0 opacity-50" />
                {value}
             </span>
          ) : (
            "Seleccionar repositorio..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-[200]" align="start">
        <div className="flex flex-col max-h-[300px]">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2 sticky top-0 bg-popover z-10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Buscar repositorio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto overflow-x-hidden p-1">
             {loadingRepos && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
            
            {!loadingRepos && filteredRepos.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    No se encontraron repositorios.
                </p>
            )}

            {!loadingRepos && filteredRepos.map((repo) => (
                <div
                    key={repo.full_name}
                    className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                        value === repo.full_name && "bg-accent/50"
                    )}
                    onClick={() => handleSelectRepo(repo.full_name, repo.default_branch)}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                    }}
                >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === repo.full_name ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div className="flex items-center gap-2 truncate flex-1">
                         {repo.private ? (
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          ) : (
                            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        <span className="truncate">{repo.full_name}</span>
                    </div>
                </div>
            ))}
          </div>

          <Separator />
          
          {/* Footer Action */}
          <div className="p-1 sticky bottom-0 bg-popover border-t">
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary transition-colors"
                onClick={() => {
                    setShowCreateForm(true);
                    setOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear nuevo repositorio
              </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
