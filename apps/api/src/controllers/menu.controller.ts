import { Request, Response } from "express";
import { MenuItemModel } from "../models/MenuItem";
import { emitToRestaurant } from "../socket";

export async function getMenuItems(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params.restaurantId;
  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const items = await MenuItemModel.find({ restaurantId }).populate("categoryId");
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch menu items" });
  }
}

export async function createMenuItem(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  const itemData = req.body;

  try {
    const newItem = new MenuItemModel({
      ...itemData,
      restaurantId,
    });

    await newItem.save();
    return res.status(201).json(newItem);
  } catch (error) {
    console.error("Create MenuItem Error:", error);
    return res.status(500).json({ message: "Failed to create menu item" });
  }
}

export async function updateMenuItem(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const updates = req.body;

  try {
    const item = await MenuItemModel.findOneAndUpdate(
      { _id: id, restaurantId },
      updates,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Trigger real-time sync for customers
    emitToRestaurant(restaurantId, "menuItem:stockChanged", {
      menuItemId: item._id,
      isAvailable: item.isAvailable,
      isOutOfStock: item.isOutOfStock,
    });

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update menu item" });
  }
}

export async function deleteMenuItem(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const item = await MenuItemModel.findOneAndDelete({ _id: id, restaurantId });
    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    return res.status(200).json({ message: "Menu item deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete menu item" });
  }
}

export async function toggleStockStatus(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const { isOutOfStock, isAvailable } = req.body;

  try {
    const item = await MenuItemModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { 
        ...(isOutOfStock !== undefined && { isOutOfStock }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Push live socket updates to all customers/waiters connected to the restaurant tenant
    emitToRestaurant(restaurantId, "menuItem:stockChanged", {
      menuItemId: item._id,
      isAvailable: item.isAvailable,
      isOutOfStock: item.isOutOfStock,
    });

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle stock status" });
  }
}
