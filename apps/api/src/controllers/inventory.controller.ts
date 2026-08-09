import { Request, Response } from "express";
import { IngredientModel } from "../models/Ingredient";

export async function getIngredients(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  try {
    const ingredients = await IngredientModel.find({ restaurantId }).sort({ name: 1 });
    return res.status(200).json(ingredients);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch ingredients" });
  }
}

export async function createIngredient(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  const { name, unit, currentStock, lowStockThreshold, costPerUnit } = req.body;

  try {
    const newIngredient = new IngredientModel({
      restaurantId,
      name,
      unit,
      currentStock: currentStock || 0,
      lowStockThreshold: lowStockThreshold || 0,
      costPerUnit: costPerUnit || 0,
    });

    await newIngredient.save();
    return res.status(201).json(newIngredient);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create ingredient" });
  }
}

export async function updateIngredient(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const updates = req.body;

  try {
    const ingredient = await IngredientModel.findOneAndUpdate(
      { _id: id, restaurantId },
      updates,
      { new: true }
    );

    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    return res.status(200).json(ingredient);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update ingredient" });
  }
}

export async function deleteIngredient(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const ingredient = await IngredientModel.findOneAndDelete({ _id: id, restaurantId });
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    return res.status(200).json({ message: "Ingredient deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete ingredient" });
  }
}

/**
 * Adjust stock manually (e.g. Restock, Waste entry)
 */
export async function adjustStock(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const { adjustmentQuantity } = req.body; // positive to restock, negative for waste

  try {
    const ingredient = await IngredientModel.findOne({ _id: id, restaurantId });
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    ingredient.currentStock = Math.max(0, ingredient.currentStock + adjustmentQuantity);
    await ingredient.save();

    return res.status(200).json({
      message: "Stock adjusted successfully",
      ingredient,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to adjust stock" });
  }
}
