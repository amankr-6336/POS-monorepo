import { Schema, model } from "mongoose";
import { StaffUser } from "@pos/types";

const StaffUserSchema = new Schema<StaffUser>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "waiter", "chef"],
      required: true,
    },
    assignedStation: {
      type: String,
      enum: ["grill", "tandoor", "bar", "dessert", "main-kitchen"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StaffUserModel = model<StaffUser>("StaffUser", StaffUserSchema);
