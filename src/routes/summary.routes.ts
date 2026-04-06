import { Router } from "express";
import { getFinancialSummary } from "../controllers/summary.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Financial Summary (Admin and Analyst only)
router.get("/", authenticate, authorize(["admin", "analyst"]), getFinancialSummary);

export default router;
