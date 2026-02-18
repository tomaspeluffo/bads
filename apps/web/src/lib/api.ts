import axios from "axios";
import { getToken, setToken, clearToken } from "./auth";
import type {
  AuthUser,
  Client,
  ClientWithInitiatives,
  GitHubRepo,
  InitiativeDetail,
  QuestionsResponse,
  Initiative,
  Pitch,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

// --- Auth ---

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; user: AuthUser }> {
  const { data } = await api.post<{ access_token: string; user: AuthUser }>(
    "/auth/login",
    { email, password },
  );
  setToken(data.access_token);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
  clearToken();
}

// --- GitHub ---

export async function fetchGitHubAuthUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>("/auth/github");
  return data.url;
}

export async function disconnectGitHub(): Promise<void> {
  await api.delete("/auth/github");
}

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  const { data } = await api.get<{ data: GitHubRepo[] }>("/github/repos");
  return data.data;
}

export async function createGitHubRepo(
  name: string,
  isPrivate: boolean,
): Promise<{ full_name: string; default_branch: string }> {
  const { data } = await api.post<{ full_name: string; default_branch: string }>(
    "/github/repos",
    { name, isPrivate },
  );
  return data;
}

// --- Clients ---

export async function fetchClients(): Promise<Client[]> {
  const { data } = await api.get<{ data: Client[] }>("/clients");
  return data.data;
}

export async function fetchClient(clientId: string): Promise<ClientWithInitiatives> {
  const { data } = await api.get<ClientWithInitiatives>(`/clients/${clientId}`);
  return data;
}

export async function createClient(body: {
  name: string;
  slug: string;
  description?: string;
}): Promise<Client> {
  const { data } = await api.post<Client>("/clients", body);
  return data;
}

// --- Initiatives ---

export interface UploadInitiativeInput {
  title: string;
  problem: string;
  solutionSketch: string;
  noGos?: string[];
  risks?: string[];
  successCriteria?: string;
  techStack?: string;
  additionalNotes?: string;
  targetRepo?: string;
  baseBranch?: string;
  clientId?: string;
  files?: File[];
}

export async function uploadInitiative(input: UploadInitiativeInput): Promise<Initiative> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("problem", input.problem);
  formData.append("solutionSketch", input.solutionSketch);
  if (input.targetRepo) formData.append("targetRepo", input.targetRepo);
  if (input.baseBranch) formData.append("baseBranch", input.baseBranch);
  if (input.clientId) formData.append("clientId", input.clientId);
  if (input.successCriteria) formData.append("successCriteria", input.successCriteria);
  if (input.techStack) formData.append("techStack", input.techStack);
  if (input.additionalNotes) formData.append("additionalNotes", input.additionalNotes);
  if (input.noGos) {
    for (const ng of input.noGos) formData.append("noGos[]", ng);
  }
  if (input.risks) {
    for (const r of input.risks) formData.append("risks[]", r);
  }
  if (input.files) {
    for (const file of input.files) formData.append("files", file);
  }

  const { data } = await api.post<Initiative>("/initiatives/upload", formData);
  return data;
}

export async function updateInitiativeRepo(
  initiativeId: string,
  targetRepo: string,
  baseBranch?: string,
): Promise<void> {
  await api.patch(`/initiatives/${initiativeId}/repo`, { targetRepo, baseBranch });
}

export async function deleteInitiative(id: string): Promise<void> {
  await api.delete(`/initiatives/${id}`);
}

export async function fetchInitiatives(): Promise<{ data: Initiative[]; total: number }> {
  const { data } = await api.get<{ data: Initiative[]; total: number }>("/initiatives");
  return data;
}

export async function fetchInitiativeDetail(id: string): Promise<InitiativeDetail> {
  const { data } = await api.get<InitiativeDetail>(`/initiatives/${id}`);
  return data;
}

export async function fetchQuestions(id: string): Promise<QuestionsResponse> {
  const { data } = await api.get<QuestionsResponse>(`/initiatives/${id}/questions`);
  return data;
}

export async function submitReplan(
  id: string,
  additionalContext: string,
  files?: File[],
): Promise<void> {
  const formData = new FormData();
  formData.append("additionalContext", additionalContext);
  if (files) {
    for (const file of files) formData.append("files", file);
  }
  await api.post(`/initiatives/${id}/replan`, formData);
}

export type ReuploadInitiativeInput = Omit<UploadInitiativeInput, "clientId" | "targetRepo" | "baseBranch">;

export async function reuploadInitiative(
  id: string,
  input: ReuploadInitiativeInput,
): Promise<void> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("problem", input.problem);
  formData.append("solutionSketch", input.solutionSketch);
  if (input.successCriteria) formData.append("successCriteria", input.successCriteria);
  if (input.techStack) formData.append("techStack", input.techStack);
  if (input.additionalNotes) formData.append("additionalNotes", input.additionalNotes);
  if (input.noGos) {
    for (const ng of input.noGos) formData.append("noGos[]", ng);
  }
  if (input.risks) {
    for (const r of input.risks) formData.append("risks[]", r);
  }
  if (input.files) {
    for (const file of input.files) formData.append("files", file);
  }
  await api.put(`/initiatives/${id}/reupload`, formData);
}

export async function decomposeFeature(
  initiativeId: string,
  featureId: string,
): Promise<void> {
  await api.post(`/initiatives/${initiativeId}/features/${featureId}/decompose`);
}

export async function updateTaskStatus(
  initiativeId: string,
  featureId: string,
  taskId: string,
  status: string,
): Promise<void> {
  await api.patch(`/initiatives/${initiativeId}/features/${featureId}/tasks/${taskId}/status`, { status });
}

// --- Pitches ---

export interface CreatePitchInput {
  title: string;
  brief: string;
  clientId?: string;
}

export async function createPitch(input: CreatePitchInput): Promise<Pitch> {
  const { data } = await api.post<Pitch>("/pitches", input);
  return data;
}

export async function fetchPitch(pitchId: string): Promise<Pitch> {
  const { data } = await api.get<Pitch>(`/pitches/${pitchId}`);
  return data;
}

export async function fetchPitchesByClient(clientId: string): Promise<{ data: Pitch[]; total: number }> {
  const { data } = await api.get<{ data: Pitch[]; total: number }>("/pitches", { params: { clientId } });
  return data;
}

export async function convertPitchToInitiative(pitchId: string): Promise<{ initiativeId: string }> {
  const { data } = await api.post<{ initiativeId: string }>(`/pitches/${pitchId}/to-initiative`);
  return data;
}

export async function deletePitch(pitchId: string): Promise<void> {
  await api.delete(`/pitches/${pitchId}`);
}
