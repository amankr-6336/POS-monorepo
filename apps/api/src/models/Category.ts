import { Schema, model } from "mongoose";
import { Category, Subcategory } from "@pos/types";

const SubcategorySchema = new Schema<Subcategory>({
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const CategorySchema = new Schema<Category>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    subcategories: [SubcategorySchema],
  },
  { timestamps: true }
);

export const CategoryModel = model<Category>("Category", CategorySchema);
