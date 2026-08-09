import { Schema, model } from "mongoose";

const LeadSchema = new Schema(
  {
    name: { type: String, required: true },
    restaurantName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export const LeadModel = model("Lead", LeadSchema);
