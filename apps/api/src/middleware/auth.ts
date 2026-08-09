import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StaffUserModel } from "../models/StaffUser";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    restaurantId: string;
    role: "owner" | "manager" | "waiter" | "chef";
    name: string;
    assignedStation?: string;
  };
  customer?: {
    customerId: string;
    tableId: string;
    restaurantId: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_pos_jwt_key_991823";

/**
 * Middleware to authenticate staff requests using JWT
 */
export async function authStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      restaurantId: string;
      role: "owner" | "manager" | "waiter" | "chef";
      name: string;
      assignedStation?: string;
    };

    const user = await StaffUserModel.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User is suspended or does not exist" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session token" });
  }
}

/**
 * Middleware to restrict route access by role
 */
export function requireRoles(roles: ("owner" | "manager" | "waiter" | "chef")[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access forbidden: insufficient permissions" });
    }
    next();
  };
}

/**
 * Middleware to authenticate customer session requests (table-scoped)
 */
export function authCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.customerToken) {
      token = req.cookies.customerToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Session token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      customerId: string;
      tableId: string;
      restaurantId: string;
    };

    req.customer = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid customer session. Please re-scan table QR" });
  }
}
