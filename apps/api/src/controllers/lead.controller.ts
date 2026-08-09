import { Request, Response } from "express";
import { LeadModel } from "../models/Lead";

export async function createLead(req: Request, res: Response) {
  const { name, restaurantName, email, phone, message } = req.body;

  try {
    const lead = new LeadModel({
      name,
      restaurantName,
      email,
      phone,
      message,
    });

    await lead.save();
    return res.status(201).json({
      message: "Lead inquiry captured successfully",
      lead,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit contact request" });
  }
}
