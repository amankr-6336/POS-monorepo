import { Schema, model } from "mongoose";
import { Restaurant } from "@pos/types";

const RestaurantSchema = new Schema<Restaurant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logoUrl: { type: String },
    address: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    cuisineTags: [{ type: String }],
    operatingHours: [
      {
        day: { type: String, required: true },
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
    ],
    subscriptionPlan: {
      type: String,
      enum: ["trial", "basic", "pro"],
      default: "trial",
    },
    isActive: { type: Boolean, default: true },
    tableSessionTimeoutMinutes: { type: Number, default: 180 },
  },
  { timestamps: true }
);

export const RestaurantModel = model<Restaurant>("Restaurant", RestaurantSchema);
