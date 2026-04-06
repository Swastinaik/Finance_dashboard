import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { AppError } from "../utils/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema, userUpdateSchema } from "../schemas/user.schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || "Validation Error", 400);
  }

  const { name, password, role } = validation.data;

  const existingUser = await User.findOne({ name });
  if (existingUser) {
    throw new AppError("User with this name already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    password_hash: hashedPassword,
    role: role || "viewer",
  });

  res.status(201).json({
    status: "success",
    data: {
      user: { id: newUser._id, name: newUser.name, role: newUser.role },
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || "Validation Error", 400);
  }

  const { name, password } = validation.data;

  const user = await User.findOne({ name });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: { id: user._id, name: user.name, role: user.role },
    },
  });
});

// Admin only: Update user role or status
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = userUpdateSchema.safeParse(req.body);

  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || "Validation Error", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { ...validation.data },
    { new: true, runValidators: true }
  ).select("_id name role status updatedAt");

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});
