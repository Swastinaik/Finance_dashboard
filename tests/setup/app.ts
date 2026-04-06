import express from "express";
import cors from "cors";
import authRoutes from "../../src/routes/auth.routes.js";
import recordRoutes from "../../src/routes/record.routes.js";
import summaryRoutes from "../../src/routes/summary.routes.js";
import { errorHandler } from "../../src/utils/errorHandler.js";

/**
 * Creates the Express app without starting the DB or listening.
 * Import this in every test file instead of the real index.ts.
 */
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/records", recordRoutes);
  app.use("/api/summary", summaryRoutes);

  app.get("/", (_req, res) => {
    res.json({ message: "Welcome to the Finance API" });
  });

  app.use(errorHandler);

  return app;
}
