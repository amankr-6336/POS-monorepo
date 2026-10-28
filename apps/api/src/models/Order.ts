import { Schema, model } from "mongoose";
import { Order, OrderItem } from "@pos/types";

const OrderItemSchema = new Schema<OrderItem>({
  menuItemId: { type: Schema.Types.ObjectId as any, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  basePrice: { type: Number },
  quantity: { type: Number, required: true },
  itemStatus: {
    type: String,
    enum: ["queued", "preparing", "ready", "served", "cancelled"],
    default: "queued",
  },
  specialInstructions: { type: String, default: "" },
  prepStation: { type: String },
  selectedVariant: {
    groupName: { type: String },
    optionName: { type: String },
    priceDelta: { type: Number, default: 0 },
    ingredientOverrides: [
      {
        ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient" },
        quantity: { type: Number },
        unit: { type: String, enum: ["g", "kg", "ml", "l", "pcs"] },
      },
    ],
  },
  selectedVariants: [
    {
      groupName: { type: String },
      optionName: { type: String },
      priceDelta: { type: Number, default: 0 },
      ingredientOverrides: [
        {
          ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient" },
          quantity: { type: Number },
          unit: { type: String, enum: ["g", "kg", "ml", "l", "pcs"] },
        },
      ],
    },
  ],
  selectedModifiers: [
    {
      groupName: { type: String },
      optionName: { type: String },
      priceDelta: { type: Number, default: 0 },
      ingredients: [
        {
          ingredientId: { type: Schema.Types.ObjectId as any, ref: "Ingredient" },
          quantity: { type: Number },
          unit: { type: String, enum: ["g", "kg", "ml", "l", "pcs"] },
        },
      ],
    },
  ],
});

const OrderSchema = new Schema<Order>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    tableId: { type: Schema.Types.ObjectId as any, ref: "Table", required: true, index: true },
    tableSessionId: { type: Schema.Types.ObjectId as any, ref: "TableSession", index: true },
    customerId: { type: Schema.Types.ObjectId as any, ref: "Customer" },
    items: [OrderItemSchema],
    status: {
      type: String,
      enum: ["placed", "confirmed", "preparing", "ready", "served", "billed", "cancelled"],
      default: "placed",
      index: true,
    },
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    servedAt: { type: Date },
    placedByStaffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser", index: true },
    lastEditedByStaffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser" },
    auditLog: [
      {
        action: { type: String, required: true },
        staffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser" },
        staffName: { type: String },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const OrderModel = model<Order>("Order", OrderSchema);
