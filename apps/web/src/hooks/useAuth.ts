import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "@/lib/auth";
import { login, fetchMe, logout } from "@/lib/api";

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: user,
    isLoading: loading,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: !!getToken(),
    retry: false,
  });

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      navigate("/");
    },
  });

  const signOutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearToken();
      queryClient.clear();
      navigate("/login");
    },
  });

  return {
    user: user ?? null,
    loading,
    signIn: signInMutation.mutate,
    signOut: () => signOutMutation.mutate(),
    loginError: signInMutation.error,
    isLoggingIn: signInMutation.isPending,
  };
}
