import { Schema, model } from "mongoose";
import { MenuItem } from "@pos/types";

const MenuItemSchema = new Schema<MenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId as any, ref: "Category", required: true },
    subcategoryId: { type: Schema.Types.ObjectId as any },
    name: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    price: { type: Number, required: true },
    calories: { type: Number },
    dietaryTags: [
      {
        type: String,
        enum: ["veg", "non-veg", "vegan", "gluten-free", "contains-nuts"],
      },
    ],
    spiceLevel: {
      type: String,
      enum: ["mild", "medium", "hot"],
    },
    ingredients: [
      {
        ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient", required: true },
        quantity: { type: Number, required: true },
        unit: {
          type: String,
          enum: ["g", "kg", "ml", "l", "pcs"],
          required: true,
        },
      },
    ],
    variantGroups: [
      {
        name: { type: String, required: true },
        options: [
          {
            name: { type: String, required: true },
            priceDelta: { type: Number, default: 0 },
            ingredientOverrides: [
              {
                ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient", required: true },
                quantity: { type: Number, required: true },
                unit: { type: String, enum: ["g", "kg", "ml", "l", "pcs"] },
              },
            ],
          },
        ],
      },
    ],
    modifierGroups: [
      {
        name: { type: String, required: true },
        multiSelect: { type: Boolean, default: false },
        minSelections: { type: Number },
        maxSelections: { type: Number },
        options: [
          {
            name: { type: String, required: true },
            priceDelta: { type: Number, default: 0 },
            ingredients: [
              {
                ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient", required: true },
                quantity: { type: Number, required: true },
                unit: { type: String, enum: ["g", "kg", "ml", "l", "pcs"] },
              },
            ],
          },
        ],
      },
    ],
    isAvailable: { type: Boolean, default: true },
    isOutOfStock: { type: Boolean, default: false },
    prepStation: {
      type: String,
      enum: ["grill", "tandoor", "bar", "dessert", "main-kitchen"],
      default: "main-kitchen",
    },
    avgPrepTimeMinutes: { type: Number },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const MenuItemModel = model<MenuItem>("MenuItem", MenuItemSchema);
