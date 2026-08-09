import { Request, Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { TableModel } from "../models/Table";
import { RestaurantModel } from "../models/Restaurant";

const CLIENT_CUSTOMER_URL = process.env.CLIENT_CUSTOMER_URL || "http://localhost:5174";

export async function getTables(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  try {
    const tables = await TableModel.find({ restaurantId }).sort({ label: 1 });
    return res.status(200).json(tables);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createTable(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  const { label, capacity, location } = req.body;

  try {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const qrToken = crypto.randomBytes(16).toString("hex");
    const qrUrl = `${CLIENT_CUSTOMER_URL}/r/${restaurant.slug}/t/${qrToken}`;
    
    // Generate QR code as base64 Data URL
    const qrCodeUrl = await QRCode.toDataURL(qrUrl);

    const newTable = new TableModel({
      restaurantId,
      label,
      capacity,
      location,
      qrCodeUrl,
      qrToken,
      status: "available",
    });

    await newTable.save();
    return res.status(201).json(newTable);
  } catch (error) {
    console.error("Create Table Error:", error);
    return res.status(500).json({ message: "Failed to create table" });
  }
}

export async function updateTable(req: Request, res: Response) {
  const { tableId } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const updates = req.body;

  try {
    const table = await TableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      updates,
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    return res.status(200).json(table);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update table" });
  }
}

export async function deleteTable(req: Request, res: Response) {
  const { tableId } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const table = await TableModel.findOneAndDelete({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    return res.status(200).json({ message: "Table deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete table" });
  }
}

export async function regenerateTableQR(req: Request, res: Response) {
  const { tableId } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const qrToken = crypto.randomBytes(16).toString("hex");
    const qrUrl = `${CLIENT_CUSTOMER_URL}/r/${restaurant.slug}/t/${qrToken}`;
    const qrCodeUrl = await QRCode.toDataURL(qrUrl);

    const table = await TableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      { qrToken, qrCodeUrl },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    return res.status(200).json(table);
  } catch (error) {
    return res.status(500).json({ message: "Failed to regenerate QR code" });
  }
}

/**
 * Resolves QR scanned table parameters for the Customer Web App PWA
 */
export async function resolveTableQR(req: Request, res: Response) {
  const { slug, qrToken } = req.params;

  try {
    const restaurant = await RestaurantModel.findOne({ slug, isActive: true });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found or inactive" });
    }

    const table = await TableModel.findOne({ restaurantId: restaurant._id, qrToken });
    if (!table) {
      return res.status(404).json({ message: "Table token is invalid or has been regenerated" });
    }

    return res.status(200).json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        logoUrl: restaurant.logoUrl,
        slug: restaurant.slug,
      },
      table: {
        id: table._id,
        label: table.label,
        location: table.location,
        status: table.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Error resolving table QR" });
  }
}
