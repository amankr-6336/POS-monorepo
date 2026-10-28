import { Request, Response } from "express";
import { AuditLogModel } from "../models/AuditLog";

/**
 * Retrieves audit log entries for a restaurant with filtering by staff member,
 * action type, or entityType, ordered chronologically descending.
 * Restricted to owner and manager roles.
 */
export async function getAuditLogs(req: Request, res: Response) {
  const restaurantId = req.params.id || (req as any).user?.restaurantId;
  const { staffId, action, entityType, limit = 50, page = 1 } = req.query;

  try {
    const query: any = { restaurantId };

    if (staffId && typeof staffId === "string" && staffId !== "all") {
      query.staffId = staffId;
    }

    if (action && typeof action === "string" && action !== "all") {
      query.action = action;
    }

    if (entityType && typeof entityType === "string" && entityType !== "all") {
      query.entityType = entityType;
    }

    const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * pageSize;

    const [auditLogs, total] = await Promise.all([
      AuditLogModel.find(query)
        .populate("staffId", "name email role")
        .sort({ timestamp: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return res.status(200).json({
      auditLogs,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
}
