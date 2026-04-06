import mongoose, { Document, Schema } from "mongoose";

export type UserStatus = "active" | "inactive";
export type UserRole = "viewer" | "analyst" | "admin";

export interface IUser extends Document {
  name: string;
  status: UserStatus;
  password_hash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ["viewer", "analyst", "admin"], default: "viewer" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
