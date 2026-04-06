import mongoose, { Document, Schema, Types } from "mongoose";

export type RecordType = "income" | "expense";

export interface IRecord extends Document {
  amount: number;
  type: RecordType;
  category: string;
  date: Date;
  notes?: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecordSchema = new Schema<IRecord>(
  {
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Record = mongoose.model<IRecord>("Record", RecordSchema);
