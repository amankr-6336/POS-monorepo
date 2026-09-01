import { Schema, model } from "mongoose";
import { TableSession } from "@pos/types";

const TableSessionSchema = new Schema<TableSession>(
  {
    tableId: { type: Schema.Types.ObjectId as any, ref: "Table", required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedByStaffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser", default: null },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TableSessionSchema.index({ tableId: 1, status: 1 });
TableSessionSchema.index({ restaurantId: 1, status: 1 });

export const TableSessionModel = model<TableSession>("TableSession", TableSessionSchema);
