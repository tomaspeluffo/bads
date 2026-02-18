import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInitiativeDetail,
  fetchQuestions,
  submitReplan,
  reuploadInitiative,
  uploadInitiative,
  deleteInitiative,
  updateInitiativeRepo,
  decomposeFeature,
  updateTaskStatus,
  chatWithPlan,
  approvePlan,
} from "@/lib/api";
import type { UploadInitiativeInput, ReuploadInitiativeInput } from "@/lib/api";

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

export function useReuploadInitiative(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReuploadInitiativeInput) =>
      reuploadInitiative(initiativeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
      queryClient.invalidateQueries({
        queryKey: ["initiative", initiativeId, "questions"],
      });
    },
  });
}

export function useDecomposeFeature(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => decomposeFeature(initiativeId, featureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}

export function useUpdateTaskStatus(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, taskId, status }: { featureId: string; taskId: string; status: string }) =>
      updateTaskStatus(initiativeId, featureId, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}

export function useUpdateRepo(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetRepo, baseBranch }: { targetRepo: string; baseBranch?: string }) =>
      updateInitiativeRepo(initiativeId, targetRepo, baseBranch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}

export function useApprovePlan(initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approvePlan(initiativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiative", initiativeId] });
    },
  });
}

export function usePlanChat(initiativeId: string) {
  return useMutation({
    mutationFn: ({
      message,
      history,
    }: {
      message: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    }) => chatWithPlan(initiativeId, message, history),
  });
}
