import { Request, Response } from "express";
import { CategoryModel } from "../models/Category";

export async function getCategories(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params.restaurantId;
  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const categories = await CategoryModel.find({ restaurantId }).sort({ order: 1 });
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
}

export async function createCategory(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  const { name, order, subcategories } = req.body;

  try {
    const newCategory = new CategoryModel({
      restaurantId,
      name,
      order: order || 0,
      subcategories: subcategories || [],
    });

    await newCategory.save();
    return res.status(201).json(newCategory);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create category" });
  }
}

export async function updateCategory(req: Request, res: Response) {
  const { categoryId } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const { name, order, subcategories } = req.body;

  try {
    const category = await CategoryModel.findOneAndUpdate(
      { _id: categoryId, restaurantId },
      { name, order, subcategories },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update category" });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  const { categoryId } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const category = await CategoryModel.findOneAndDelete({ _id: categoryId, restaurantId });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete category" });
  }
}
