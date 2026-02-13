import { Router } from "express";
import crypto from "node:crypto";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { CreateRepoBody } from "../models/api-schemas.js";
import { query } from "../lib/db.js";
import { redis } from "../lib/redis.js";
import { env } from "../config/env.js";
import * as githubService from "../services/github.service.js";
import { getGithubTokenForUser } from "../services/github-token.service.js";
import type { AuthUser } from "../types/index.js";

export const githubRouter = Router();

const GITHUB_STATE_PREFIX = "gh_oauth_state:";
const STATE_TTL_SECONDS = 600; // 10 minutes

// GET /api/auth/github — initiate OAuth flow
githubRouter.get(
  "/auth/github",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      res.status(500).json({ error: "GitHub OAuth no está configurado en el servidor" });
      return;
    }

    const user = (req as typeof req & { user: AuthUser }).user;
    const state = crypto.randomUUID();

    await redis.set(`${GITHUB_STATE_PREFIX}${state}`, user.id, "EX", STATE_TTL_SECONDS);

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${req.protocol}://${req.get("host")}/api/auth/github/callback`,
      scope: "repo,read:user",
      state,
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  }),
);

// GET /api/auth/github/callback — OAuth callback (no auth required, redirects to frontend)
githubRouter.get(
  "/auth/github/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.redirect(`${env.FRONTEND_URL}?github_error=missing_params`);
      return;
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      res.redirect(`${env.FRONTEND_URL}?github_error=not_configured`);
      return;
    }

    // Validate state
    const userId = await redis.get(`${GITHUB_STATE_PREFIX}${state}`);
    if (!userId) {
      res.redirect(`${env.FRONTEND_URL}?github_error=invalid_state`);
      return;
    }

    await redis.del(`${GITHUB_STATE_PREFIX}${state}`);

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      res.redirect(`${env.FRONTEND_URL}?github_error=token_exchange_failed`);
      return;
    }

    // Fetch GitHub user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = (await userResponse.json()) as {
      login: string;
      avatar_url: string;
    };

    // Save to database
    await query(
      `UPDATE users
       SET github_access_token = $1, github_username = $2, github_avatar_url = $3, updated_at = now()
       WHERE id = $4`,
      [tokenData.access_token, githubUser.login, githubUser.avatar_url, userId],
    );

    res.redirect(`${env.FRONTEND_URL}?github_connected=true`);
  }),
);

// DELETE /api/auth/github — disconnect GitHub
githubRouter.delete(
  "/auth/github",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = (req as typeof req & { user: AuthUser }).user;

    await query(
      `UPDATE users
       SET github_access_token = NULL, github_username = NULL, github_avatar_url = NULL, updated_at = now()
       WHERE id = $1`,
      [user.id],
    );

    res.json({ message: "GitHub desconectado" });
  }),
);

// GET /api/github/repos — list user's GitHub repos
githubRouter.get(
  "/github/repos",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = (req as typeof req & { user: AuthUser }).user;
    const token = await getGithubTokenForUser(user.id);

    if (!token) {
      res.status(400).json({ error: "GitHub no está conectado" });
      return;
    }

    const repos = await githubService.listUserRepos(token);
    res.json({ data: repos });
  }),
);

// POST /api/github/repos — create a new repo
githubRouter.post(
  "/github/repos",
  authMiddleware,
  validate({ body: CreateRepoBody }),
  asyncHandler(async (req, res) => {
    const user = (req as typeof req & { user: AuthUser }).user;
    const { name, isPrivate } = req.body as CreateRepoBody;
    const token = await getGithubTokenForUser(user.id);

    if (!token) {
      res.status(400).json({ error: "GitHub no está conectado" });
      return;
    }

    const repo = await githubService.createRepo(name, isPrivate, token);
    res.status(201).json(repo);
  }),
);
