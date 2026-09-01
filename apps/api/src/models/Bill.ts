import { Schema, model } from "mongoose";
import { Bill } from "@pos/types";

const BillSchema = new Schema<Bill>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    tableSessionId: { type: Schema.Types.ObjectId as any, ref: "TableSession", index: true },
    orderId: { type: Schema.Types.ObjectId as any, ref: "Order", index: true },
    orderIds: [{ type: Schema.Types.ObjectId as any, ref: "Order" }],
    tableLabel: { type: String, required: true },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId as any, ref: "MenuItem", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
    printedAt: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["pending", "settled_externally"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const BillModel = model<Bill>("Bill", BillSchema);
