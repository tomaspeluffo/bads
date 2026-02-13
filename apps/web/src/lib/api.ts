import axios from "axios";
import { getToken, setToken, clearToken } from "./auth";
import type {
  AuthUser,
  Client,
  ClientWithInitiatives,
  InitiativeDetail,
  QuestionsResponse,
  Initiative,
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
  responsable?: string;
  soporte?: string;
  targetRepo: string;
  baseBranch?: string;
  clientId?: string;
  files?: File[];
}

export async function uploadInitiative(input: UploadInitiativeInput): Promise<Initiative> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("problem", input.problem);
  formData.append("solutionSketch", input.solutionSketch);
  formData.append("targetRepo", input.targetRepo);
  if (input.baseBranch) formData.append("baseBranch", input.baseBranch);
  if (input.clientId) formData.append("clientId", input.clientId);
  if (input.responsable) formData.append("responsable", input.responsable);
  if (input.soporte) formData.append("soporte", input.soporte);
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

export async function approveFeature(
  initiativeId: string,
  featureId: string,
): Promise<void> {
  await api.post(`/initiatives/${initiativeId}/features/${featureId}/approve`);
}

export async function rejectFeature(
  initiativeId: string,
  featureId: string,
  feedback: string,
): Promise<void> {
  await api.post(`/initiatives/${initiativeId}/features/${featureId}/reject`, {
    feedback,
  });
}
