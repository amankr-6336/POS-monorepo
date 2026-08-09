import { Schema, model } from "mongoose";
import { Customer } from "@pos/types";

const CustomerSchema = new Schema<Customer>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    visitCount: { type: Number, default: 1 },
    totalSpend: { type: Number, default: 0 },
    lastVisitAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique compound index so that mobileNumber is unique per restaurant tenant
CustomerSchema.index({ restaurantId: 1, mobileNumber: 1 }, { unique: true });

export const CustomerModel = model<Customer>("Customer", CustomerSchema);
