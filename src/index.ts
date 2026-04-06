import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./db/index.js";
import authRoutes from "./routes/auth.routes.js";
import recordRoutes from "./routes/record.routes.js";
import summaryRoutes from "./routes/summary.routes.js";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/summary", summaryRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Finance API" });
});

// Global Error Handler
app.use(errorHandler);

// Connect to DB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
});
