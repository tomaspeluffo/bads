// --- Status unions ---

export type InitiativeStatus =
  | "pending"
  | "planning"
  | "needs_info"
  | "planned"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type FeatureStatus =
  | "pending"
  | "decomposing"
  | "developing"
  | "qa_review"
  | "human_review"
  | "approved"
  | "merging"
  | "merged"
  | "rejected"
  | "failed";

export type TaskStatus = "to_do" | "doing" | "review" | "done" | "failed";

// --- Auth ---

export interface AuthUser {
  id: string;
  email?: string;
  github_username?: string | null;
  github_connected?: boolean;
}

export interface GitHubRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
}

// --- Core entities ---

export interface Client {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Initiative {
  id: string;
  notion_page_id: string;
  notion_url: string | null;
  title: string;
  raw_content: Record<string, unknown> | null;
  status: InitiativeStatus;
  started_by: string | null;
  client_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  initiative_id: string;
  version: number;
  summary: string;
  raw_output: Record<string, unknown> | null;
  feature_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  feature_id: string;
  sequence_order: number;
  title: string;
  description: string;
  task_type: string;
  file_paths: string[] | null;
  status: TaskStatus;
  agent_output: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  plan_id: string;
  initiative_id: string;
  sequence_order: number;
  title: string;
  description: string;
  acceptance_criteria: string[] | null;
  branch_name: string | null;
  pr_number: number | null;
  pr_url: string | null;
  status: FeatureStatus;
  rejection_feedback: string | null;
  retry_count: number;
  tasks: Task[];
  created_at: string;
  updated_at: string;
}

// --- Composite types ---

export interface InitiativeDetail extends Initiative {
  plan: Plan | null;
  features: Feature[];
  metrics: {
    totalTokens: number;
    totalDurationMs: number;
    executionCount: number;
  };
}

export interface ClientWithInitiatives extends Client {
  initiatives: Initiative[];
}

export interface PlannerQuestion {
  category: string;
  question: string;
  why: string;
}

export interface QuestionsResponse {
  initiativeId: string;
  status: InitiativeStatus;
  analysis: string | null;
  questions: (string | PlannerQuestion)[];
}
