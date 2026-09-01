import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomerModel } from "../models/Customer";
import * as sessionService from "../services/session.service";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_pos_jwt_key_991823";

/**
 * Creates or fetches a customer based on their mobile number.
 * Ensures an active TableSession exists and signs a short-lived table-scoped JWT session token.
 */
export async function getOrCreateCustomerSession(req: Request, res: Response) {
  const { name, mobileNumber, tableId, restaurantId } = req.body;
  if (!tableId || !restaurantId) {
    return res.status(400).json({ message: "Table ID and Restaurant ID are required" });
  }

  try {
    // Ensure an active TableSession exists for this table
    const { session } = await sessionService.getOrOpenActiveSession(tableId, restaurantId);

    let customer = await CustomerModel.findOne({ restaurantId, mobileNumber });

    if (customer) {
      customer.visitCount += 1;
      customer.lastVisitAt = new Date();
      // Keep original name or update if provided
      if (name) customer.name = name;
      await customer.save();
    } else {
      customer = new CustomerModel({
        restaurantId,
        name,
        mobileNumber,
        visitCount: 1,
        totalSpend: 0,
        lastVisitAt: new Date(),
      });
      await customer.save();
    }

    // Sign the lightweight table-scoped session token with tableSessionId
    const customerToken = jwt.sign(
      {
        customerId: customer._id,
        tableId,
        restaurantId,
        tableSessionId: session._id,
      },
      JWT_SECRET,
      { expiresIn: "12h" } // Session lasts for standard dining times
    );

    return res.status(200).json({
      customerToken,
      customer: {
        id: customer._id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        visitCount: customer.visitCount,
      },
      session: {
        id: session._id,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Customer Session Creation Error:", error);
    return res.status(500).json({ message: "Failed to initialize customer session" });
  }
}
