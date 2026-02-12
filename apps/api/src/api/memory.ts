import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { ListPatternsQuery } from "../models/api-schemas.js";
import * as memoryService from "../services/memory.service.js";

export const memoryRouter = Router();

// GET /api/memory/patterns
memoryRouter.get(
  "/memory/patterns",
  authMiddleware,
  validate({ query: ListPatternsQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListPatternsQuery;
    const result = await memoryService.listPatterns(query);
    res.json(result);
  }),
);
