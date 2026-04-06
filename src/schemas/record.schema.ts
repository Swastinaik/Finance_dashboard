import { z } from "zod";

export const recordCreateSchema = z.object({
  amount: z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
  date: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
});

export const recordUpdateSchema = recordCreateSchema.partial();

export type RecordCreateSchema = z.infer<typeof recordCreateSchema>;
export type RecordUpdateSchema = z.infer<typeof recordUpdateSchema>;
