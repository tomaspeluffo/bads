import { useState, useRef, useEffect } from "react";
import { Github, Plus, Loader2, Search, Lock, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          {connect.isPending ? "Redirigiendo..." : "Conectar GitHub para seleccionar repositorio"}
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

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Github className="h-4 w-4 shrink-0" />
          {value || "Seleccionar repositorio..."}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar repositorio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>

          {/* Loading */}
          {loadingRepos && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando repositorios...
            </div>
          )}

          {/* Repo list */}
          {!loadingRepos && !showCreateForm && (
            <ScrollArea className="max-h-60">
              <div className="p-1">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.full_name}
                    type="button"
                    onClick={() => handleSelectRepo(repo.full_name, repo.default_branch)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                      value === repo.full_name && "bg-accent",
                    )}
                  >
                    {repo.private ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{repo.full_name}</span>
                  </button>
                ))}
                {filteredRepos.length === 0 && !loadingRepos && (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No se encontraron repositorios
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Create form */}
          {showCreateForm && (
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre del repositorio</Label>
                <Input
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="mi-nuevo-repo"
                  className="h-9"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                  className="rounded border-input"
                />
                Repositorio privado
              </label>
              <div className="flex gap-2">
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
                  {createRepo.isPending ? "Creando..." : "Crear"}
                </Button>
              </div>
              {createRepo.isError && (
                <p className="text-xs text-destructive">Error al crear el repositorio</p>
              )}
            </div>
          )}

          {/* Footer: create new repo */}
          {!showCreateForm && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                Crear nuevo repositorio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
