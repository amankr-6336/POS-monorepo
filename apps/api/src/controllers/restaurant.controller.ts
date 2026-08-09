import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { RestaurantModel } from "../models/Restaurant";
import { StaffUserModel } from "../models/StaffUser";
import { generateSlug } from "@pos/utils";

export async function createRestaurant(req: Request, res: Response) {
  const { name, address, contactPhone, contactEmail, ownerName, ownerEmail, ownerPassword } = req.body;

  try {
    const slug = generateSlug(name);
    const existing = await RestaurantModel.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "A restaurant with a similar name already exists" });
    }

    // 1. Create Restaurant Profile
    const restaurant = new RestaurantModel({
      name,
      slug,
      address,
      contactPhone,
      contactEmail,
      subscriptionPlan: "trial",
      isActive: true,
    });

    await restaurant.save();

    // 2. Create Initial Owner Account
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const owner = new StaffUserModel({
      restaurantId: restaurant._id,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      role: "owner",
      isActive: true,
    });

    await owner.save();

    return res.status(201).json({
      message: "Restaurant and owner registered successfully",
      restaurant,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
      },
    });
  } catch (error) {
    console.error("Create Restaurant Error:", error);
    return res.status(500).json({ message: "Failed to register restaurant tenant" });
  }
}

export async function getRestaurantById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const restaurant = await RestaurantModel.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    return res.status(200).json(restaurant);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch restaurant details" });
  }
}

export async function updateRestaurant(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Restrict updates to their own tenant profile
    if ((req as any).user && (req as any).user.restaurantId !== id) {
      return res.status(403).json({ message: "Access denied. Cannot update another restaurant's profile." });
    }

    const restaurant = await RestaurantModel.findByIdAndUpdate(id, updates, { new: true });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json(restaurant);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update restaurant profile" });
  }
}
