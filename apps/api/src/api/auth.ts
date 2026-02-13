import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { LoginBody } from "../models/api-schemas.js";
import { query } from "../lib/db.js";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/index.js";

export const authRouter = Router();

// POST /api/auth/login — public
authRouter.post(
  "/auth/login",
  validate({ body: LoginBody }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as LoginBody;

    const result = await query<{ id: string; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      access_token: token,
      user: { id: user.id, email: user.email },
    });
  }),
);

// GET /api/auth/me — protected
authRouter.get(
  "/auth/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = (req as typeof req & { user: AuthUser }).user;

    const result = await query<{ github_username: string | null; github_access_token: string | null }>(
      "SELECT github_username, github_access_token FROM users WHERE id = $1",
      [user.id],
    );

    const row = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        github_username: row?.github_username ?? null,
        github_connected: !!row?.github_access_token,
      },
    });
  }),
);

// POST /api/auth/logout — protected
authRouter.post(
  "/auth/logout",
  authMiddleware,
  asyncHandler(async (_req, res) => {
    res.json({ message: "Sesión cerrada" });
  }),
);
