import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./api/health.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routers
app.use("/api", healthRouter);
