import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  github_username?: string | null;
  github_connected?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  requestId: string;
}
