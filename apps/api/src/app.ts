import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { healthRouter } from "./api/health.js";
import { initiativeRouter } from "./api/initiatives.js";
import { featureRouter } from "./api/features.js";
import { memoryRouter } from "./api/memory.js";
import { webhookRouter } from "./api/webhooks.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Routers
app.use("/api", healthRouter);
app.use("/api", initiativeRouter);
app.use("/api", featureRouter);
app.use("/api", memoryRouter);
app.use("/api", webhookRouter);

// Error handler (must be last)
app.use(errorHandler);
