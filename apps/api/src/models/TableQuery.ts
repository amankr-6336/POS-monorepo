import { Schema, model } from "mongoose";
import { TableQuery } from "@pos/types";

const TableQuerySchema = new Schema<TableQuery>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    tableId: { type: Schema.Types.ObjectId as any, ref: "Table", required: true, index: true },
    raisedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedByStaffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser" },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

export const TableQueryModel = model<TableQuery>("TableQuery", TableQuerySchema);
