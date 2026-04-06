import { Router } from "express";
import { 
  getRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord 
} from "../controllers/record.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Get all records (Public/All authenticated users)
router.get("/", authenticate, getRecords);

// Administrative operations (Admin only)
router.post("/", authenticate, authorize(["admin"]), createRecord);
router.patch("/:id", authenticate, authorize(["admin"]), updateRecord);
router.delete("/:id", authenticate, authorize(["admin"]), deleteRecord);

export default router;
