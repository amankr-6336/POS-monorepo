import { Schema, model } from "mongoose";
import { OrderRating, DishRating } from "@pos/types";

const DishRatingSchema = new Schema<DishRating>({
  menuItemId: { type: Schema.Types.ObjectId as any, ref: "MenuItem", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  tags: { type: [String], default: [] },
  comment: { type: String, default: "" },
});

const OrderRatingSchema = new Schema<OrderRating>(
  {
    restaurantId: { type: Schema.Types.ObjectId as any, ref: "Restaurant", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId as any, ref: "Order", required: true, unique: true },
    tableId: { type: Schema.Types.ObjectId as any, ref: "Table", required: true },
    customerId: { type: Schema.Types.ObjectId as any, ref: "Customer", required: true },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    overallComment: { type: String, default: "" },
    dishRatings: [DishRatingSchema],
    flaggedForFollowUp: { type: Boolean, default: false, index: true },
    resolvedByStaffId: { type: Schema.Types.ObjectId as any, ref: "StaffUser" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const OrderRatingModel = model<OrderRating>("OrderRating", OrderRatingSchema);
