import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { CreateClientBody, ClientIdParams } from "../models/api-schemas.js";
import * as clientService from "../services/client.service.js";
import * as initiativeService from "../services/initiative.service.js";

export const clientRouter = Router();

// GET /api/clients - List all clients
clientRouter.get(
  "/clients",
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const clients = await clientService.listClients();
    res.json({ data: clients });
  }),
);

// POST /api/clients - Create a client
clientRouter.post(
  "/clients",
  authMiddleware,
  validate({ body: CreateClientBody }),
  asyncHandler(async (req, res) => {
    const { name, slug, description } = req.body as CreateClientBody;
    const client = await clientService.createClient({
      name,
      slug,
      description: description ?? null,
    });
    res.status(201).json(client);
  }),
);

// GET /api/clients/:clientId - Get client with its initiatives
clientRouter.get(
  "/clients/:clientId",
  authMiddleware,
  validate({ params: ClientIdParams }),
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as unknown as { clientId: string };
    const client = await clientService.getClientById(clientId);
    if (!client) throw new AppError(404, "Client not found");

    const initiatives = await initiativeService.listInitiativesByClient(clientId);
    res.json({ ...client, initiatives });
  }),
);
