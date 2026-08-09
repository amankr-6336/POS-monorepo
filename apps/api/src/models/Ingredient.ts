import { Schema, model } from "mongoose";
import { Ingredient } from "@pos/types";

const IngredientSchema = new Schema<Ingredient>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true },
    unit: {
      type: String,
      enum: ["g", "kg", "ml", "l", "pcs"],
      required: true,
    },
    currentStock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, required: true, default: 0 },
    costPerUnit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const IngredientModel = model<Ingredient>("Ingredient", IngredientSchema);
