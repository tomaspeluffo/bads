import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchGitHubAuthUrl,
  disconnectGitHub,
  fetchGitHubRepos,
  createGitHubRepo,
  fetchMe,
} from "@/lib/api";

export function useGitHubStatus() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });
}

export function useGitHubRepos(enabled: boolean) {
  return useQuery({
    queryKey: ["github", "repos"],
    queryFn: fetchGitHubRepos,
    enabled,
    staleTime: 60_000,
  });
}

export function useConnectGitHub() {
  return useMutation({
    mutationFn: async () => {
      const url = await fetchGitHubAuthUrl();
      window.location.href = url;
    },
  });
}

export function useDisconnectGitHub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectGitHub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.removeQueries({ queryKey: ["github", "repos"] });
    },
  });
}

export function useCreateGitHubRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isPrivate }: { name: string; isPrivate: boolean }) =>
      createGitHubRepo(name, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github", "repos"] });
    },
  });
}
