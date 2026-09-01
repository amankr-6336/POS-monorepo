import { Schema, model } from "mongoose";
import { Order, OrderItem } from "@pos/types";

const OrderItemSchema = new Schema<OrderItem>({
  menuItemId: { type: Schema.Types.ObjectId as any, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  itemStatus: {
    type: String,
    enum: ["queued", "preparing", "ready", "served", "cancelled"],
    default: "queued",
  },
  specialInstructions: { type: String, default: "" },
  prepStation: { type: String },
});

const OrderSchema = new Schema<Order>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    tableId: { type: Schema.Types.ObjectId as any, ref: "Table", required: true, index: true },
    tableSessionId: { type: Schema.Types.ObjectId as any, ref: "TableSession", index: true },
    customerId: { type: Schema.Types.ObjectId as any, ref: "Customer", required: true },
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
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const OrderModel = model<Order>("Order", OrderSchema);
