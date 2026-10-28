import { Schema, model } from "mongoose";
import { AuditLog } from "@pos/types";

const AuditLogSchema = new Schema<AuditLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser", index: true },
    staffName: { type: String },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    reason: { type: String, default: "" },
    note: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const AuditLogModel = model<AuditLog>("AuditLog", AuditLogSchema);
