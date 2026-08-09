import { Schema, model } from "mongoose";
import { Table } from "@pos/types";

const TableSchema = new Schema<Table>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    label: { type: String, required: true },
    capacity: { type: Number, required: true },
    location: { type: String, required: true },
    qrCodeUrl: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "needs_cleaning"],
      default: "available",
    },
    currentOrderId: { type: String },
  },
  { timestamps: true }
);

export const TableModel = model<Table>("Table", TableSchema);
