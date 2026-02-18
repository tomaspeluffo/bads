import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPitch,
  fetchPitch,
  fetchPitchesByClient,
  convertPitchToInitiative,
  deletePitch,
  type CreatePitchInput,
} from "@/lib/api";
import type { Pitch } from "@/types";

export function usePitchesByClient(clientId: string) {
  return useQuery({
    queryKey: ["pitches", "client", clientId],
    queryFn: () => fetchPitchesByClient(clientId),
    enabled: !!clientId,
  });
}

export function usePitch(pitchId: string) {
  return useQuery({
    queryKey: ["pitches", pitchId],
    queryFn: () => fetchPitch(pitchId),
    enabled: !!pitchId,
    refetchInterval: (query) => {
      const data = query.state.data as Pitch | undefined;
      if (!data) return 5000;
      if (data.status === "pending" || data.status === "generating") return 5000;
      return false;
    },
  });
}

export function useCreatePitch(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePitchInput) => createPitch(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitches", "client", clientId] });
    },
  });
}

export function useConvertPitchToInitiative(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pitchId: string) => convertPitchToInitiative(pitchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitches", "client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export function useDeletePitch(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pitchId: string) => deletePitch(pitchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitches", "client", clientId] });
    },
  });
}
