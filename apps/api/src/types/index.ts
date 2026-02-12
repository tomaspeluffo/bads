import type { Request } from "express";
import type { User } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends Request {
  user: User;
  requestId: string;
}
