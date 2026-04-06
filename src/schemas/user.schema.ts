import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long").max(50),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
});

export const loginSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(1, "Password is required"),
});

export const userUpdateSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;
