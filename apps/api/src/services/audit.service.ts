import { AuditLogModel } from "../models/AuditLog";
import { StaffUserModel } from "../models/StaffUser";

export interface LogAuditEventParams {
  restaurantId: any;
  staffId?: any;
  staffName?: string;
  action: "item_cancelled" | "order_cancelled" | "discount_applied" | "price_overridden" | string;
  entityType: "order" | "order_item" | "bill" | "menu_item" | "ingredient" | string;
  entityId: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Creates an immutable audit entry in the generic AuditLog collection.
 */
export async function logAuditEvent(params: LogAuditEventParams) {
  let staffName = params.staffName;

  if (!staffName && params.staffId) {
    try {
      const staffDoc = await StaffUserModel.findById(params.staffId).select("name role");
      if (staffDoc) {
        staffName = `${staffDoc.name} (${staffDoc.role})`;
      }
    } catch (e) {
      // Ignore lookup error
    }
  }

  const auditEntry = new AuditLogModel({
    restaurantId: params.restaurantId,
    staffId: params.staffId || null,
    staffName: staffName || "Staff / Customer",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    reason: params.reason || "",
    note: params.note || "",
    metadata: params.metadata || {},
    timestamp: params.timestamp || new Date(),
  });

  return await auditEntry.save();
}
