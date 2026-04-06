import { Router } from "express";
import { register, login, updateUser } from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Admin only: Update user role or status
router.patch("/users/:id", authenticate, authorize(["admin"]), updateUser);

export default router;
