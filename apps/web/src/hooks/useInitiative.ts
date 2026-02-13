import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInitiativeDetail,
  fetchQuestions,
  submitReplan,
  approveFeature,
  rejectFeature,
  uploadInitiative,
  deleteInitiative,
} from "@/lib/api";
import type { UploadInitiativeInput } from "@/lib/api";

export function useInitiativeDetail(id: string) {
  return useQuery({
    queryKey: ["initiative", id],
    queryFn: () => fetchInitiativeDetail(id),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function useQuestions(id: string) {
  return useQuery({
    queryKey: ["initiative", id, "questions"],
    queryFn: () => fetchQuestions(id),
    enabled: !!id,
  });
}

export function useUploadInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UploadInitiativeInput) => uploadInitiative(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInitiative(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export function useReplan(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ additionalContext, files }: { additionalContext: string; files?: File[] }) =>
      submitReplan(initiativeId, additionalContext, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
      queryClient.invalidateQueries({
        queryKey: ["initiative", initiativeId, "questions"],
      });
    },
  });
}

export function useApproveFeature(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => approveFeature(initiativeId, featureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}

export function useRejectFeature(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, feedback }: { featureId: string; feedback: string }) =>
      rejectFeature(initiativeId, featureId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}
