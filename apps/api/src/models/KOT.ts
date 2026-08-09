import { Schema, model } from "mongoose";
import { KOT } from "@pos/types";

const KOTSchema = new Schema<KOT>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId as any, ref: "Order", required: true, index: true },
    tableLabel: { type: String, required: true },
    station: {
      type: String,
      enum: ["grill", "tandoor", "bar", "dessert", "main-kitchen"],
      required: true,
      index: true,
    },
    items: [
      {
        menuItemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        specialInstructions: { type: String, default: "" },
      },
    ],
    status: {
      type: String,
      enum: ["new", "in_progress", "ready", "acknowledged"],
      default: "new",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    readyAt: { type: Date },
  },
  { timestamps: true }
);

export const KOTModel = model<KOT>("KOT", KOTSchema);
