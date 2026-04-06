import type { Request, Response } from "express";
import { Record } from "../models/index.js";
import { AppError } from "../utils/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordCreateSchema, recordUpdateSchema } from "../schemas/record.schema.js";
import mongoose from "mongoose";

// GET /api/records
export const getRecords = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt((req.query["page"]  as string) || "1",  10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query["limit"] as string) || "10", 10)));
  const skip  = (page - 1) * limit;

  const [records, totalCount] = await Promise.all([
    Record.find().sort({ date: -1 }).skip(skip).limit(limit),
    Record.countDocuments(),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      records,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    },
  });
});

// POST /api/records
export const createRecord = asyncHandler(async (req: Request, res: Response) => {
  const validation = recordCreateSchema.safeParse(req.body);
  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || "Validation Error", 400);
  }

  const { amount, type, category, date, notes } = validation.data;

  const newRecord = await Record.create({
    amount: Number(amount),
    type,
    category,
    date: date || new Date(),
    ...(notes !== undefined && { notes }),
    userId: new mongoose.Types.ObjectId(req.user!.id),
  });

  res.status(201).json({
    status: "success",
    data: { record: newRecord },
  });
});

// PATCH /api/records/:id
export const updateRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = recordUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || "Validation Error", 400);
  }

  const updateData = {
    ...validation.data,
    amount: validation.data.amount !== undefined ? Number(validation.data.amount) : undefined,
  };

  const updated = await Record.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw new AppError("Record not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: { record: updated },
  });
});

// DELETE /api/records/:id
export const deleteRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await Record.findByIdAndDelete(id);

  if (!deleted) {
    throw new AppError("Record not found", 404);
  }

  res.status(204).send();
});
