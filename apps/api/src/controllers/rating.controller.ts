import { Request, Response } from "express";
import mongoose from "mongoose";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { MenuItemModel } from "../models/MenuItem";
import { OrderRatingModel } from "../models/OrderRating";
import { emitToRestaurant } from "../socket";

/**
 * Customer submits a rating for their order and individual dishes
 */
export async function createOrUpdateRating(req: Request, res: Response) {
  const orderId = req.params.id;
  const customer = (req as any).customer;

  if (!customer) {
    return res.status(401).json({ message: "Customer session is required" });
  }

  const { overallRating, overallComment, dishRatings } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await OrderModel.findOne({ _id: orderId, restaurantId: customer.restaurantId }).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found" });
    }

    // Secure checking: Order must match the customer session
    const oTableId = (order.tableId as any)._id ? (order.tableId as any)._id.toString() : order.tableId.toString();
    const oCustomerId = (order.customerId as any)._id ? (order.customerId as any)._id.toString() : order.customerId.toString();

    if (oTableId !== customer.tableId || oCustomerId !== customer.customerId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Access forbidden: order does not belong to this table/customer session" });
    }

    // Lifecycle validation: Served or Billed
    if (order.status !== "served" && order.status !== "billed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Ratings can only be submitted once the order is served or billed" });
    }

    // Verify all dishRatings correspond to items actually present in the order
    const orderMenuItemIds = order.items.map((item: any) => item.menuItemId.toString());
    for (const dr of dishRatings || []) {
      if (!orderMenuItemIds.includes(dr.menuItemId.toString())) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Dish rating references MenuItem ID ${dr.menuItemId} which is not part of this order`,
        });
      }
    }

    // Check for existing ratings (for Edit window checks)
    const existingRating = await OrderRatingModel.findOne({ orderId }).session(session);
    const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

    const isLowRating = overallRating <= 2;
    const flaggedForFollowUp = isLowRating;

    if (existingRating) {
      const timeElapsed = Date.now() - new Date(existingRating.createdAt!).getTime();
      if (timeElapsed > EDIT_WINDOW_MS) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: "ratings can no longer be edited" });
      }

      // Update ratings & recalculate dish ratings averages
      const oldDishRatings = existingRating.dishRatings || [];

      // Perform updates on MenuItems for edited ratings
      // 1. Identify removed dish ratings (rated before but not rated now)
      for (const odr of oldDishRatings) {
        const stillRated = (dishRatings || []).some(
          (dr: any) => dr.menuItemId.toString() === odr.menuItemId.toString()
        );
        if (!stillRated) {
          await updateMenuItemRating(odr.menuItemId.toString(), { type: "remove", oldVal: odr.rating }, session);
        }
      }

      // 2. Identify new or changed dish ratings
      for (const dr of dishRatings || []) {
        const oldRatingMatch = oldDishRatings.find(
          (odr: any) => odr.menuItemId.toString() === dr.menuItemId.toString()
        );
        if (oldRatingMatch) {
          if (oldRatingMatch.rating !== dr.rating) {
            // Updated rating value
            await updateMenuItemRating(
              dr.menuItemId.toString(),
              { type: "update", oldVal: oldRatingMatch.rating, newVal: dr.rating },
              session
            );
          }
        } else {
          // Newly added dish rating in this edit
          await updateMenuItemRating(dr.menuItemId.toString(), { type: "add", newVal: dr.rating }, session);
        }
      }

      // Update existing rating document
      existingRating.overallRating = overallRating;
      existingRating.overallComment = overallComment || "";
      existingRating.dishRatings = dishRatings || [];
      existingRating.flaggedForFollowUp = flaggedForFollowUp;

      await existingRating.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Emit low rating alert if necessary
      if (isLowRating) {
        const table = await TableModel.findById(customer.tableId);
        emitToRestaurant(customer.restaurantId, "rating:lowRatingAlert", {
          tableLabel: table?.label || "Table",
          orderId,
          overallRating,
          comment: overallComment,
        });
      }

      return res.status(200).json(existingRating);
    } else {
      // Create new rating
      const newRating = new OrderRatingModel({
        restaurantId: customer.restaurantId,
        orderId,
        tableId: customer.tableId,
        customerId: customer.customerId,
        overallRating,
        overallComment: overallComment || "",
        dishRatings: dishRatings || [],
        flaggedForFollowUp,
      });

      await newRating.save({ session });

      // Calculate incremental averages for new ratings
      for (const dr of dishRatings || []) {
        await updateMenuItemRating(dr.menuItemId.toString(), { type: "add", newVal: dr.rating }, session);
      }

      await session.commitTransaction();
      session.endSession();

      // Emit alert for low rating
      if (isLowRating) {
        const table = await TableModel.findById(customer.tableId);
        emitToRestaurant(customer.restaurantId, "rating:lowRatingAlert", {
          tableLabel: table?.label || "Table",
          orderId,
          overallRating,
          comment: overallComment,
        });
      }

      return res.status(201).json(newRating);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create Rating Error:", error);
    return res.status(500).json({ message: "Failed to submit rating" });
  }
}

/**
 * Recalculate MenuItem rating average incrementally inside transaction session
 */
async function updateMenuItemRating(
  menuItemId: string,
  ratingChange: { type: "add" | "update" | "remove"; oldVal?: number; newVal?: number },
  session: mongoose.ClientSession
) {
  const menuItem = await MenuItemModel.findById(menuItemId).session(session);
  if (!menuItem) return;

  const A = menuItem.avgRating || 0;
  const C = menuItem.ratingCount || 0;

  if (ratingChange.type === "add") {
    const newVal = ratingChange.newVal!;
    menuItem.ratingCount = C + 1;
    menuItem.avgRating = parseFloat(((A * C + newVal) / (C + 1)).toFixed(2));
  } else if (ratingChange.type === "update") {
    const oldVal = ratingChange.oldVal!;
    const newVal = ratingChange.newVal!;
    if (C > 0) {
      menuItem.avgRating = parseFloat(((A * C - oldVal + newVal) / C).toFixed(2));
    } else {
      menuItem.ratingCount = 1;
      menuItem.avgRating = newVal;
    }
  } else if (ratingChange.type === "remove") {
    const oldVal = ratingChange.oldVal!;
    if (C > 1) {
      menuItem.ratingCount = C - 1;
      menuItem.avgRating = parseFloat(((A * C - oldVal) / (C - 1)).toFixed(2));
    } else {
      menuItem.ratingCount = 0;
      menuItem.avgRating = 0;
    }
  }

  await menuItem.save({ session });
}

/**
 * Staff retrieves ratings with filters and pagination
 */
export async function getRatings(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  const { dateFrom, dateTo, menuItemId, minRating, maxRating, flaggedOnly, page = 1, limit = 10 } = req.query;

  try {
    const filter: any = { restaurantId };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
    }

    if (menuItemId) {
      filter["dishRatings.menuItemId"] = menuItemId;
    }

    if (minRating || maxRating) {
      filter.overallRating = {};
      if (minRating) filter.overallRating.$gte = parseInt(minRating as string, 10);
      if (maxRating) filter.overallRating.$lte = parseInt(maxRating as string, 10);
    }

    if (flaggedOnly === "true") {
      filter.flaggedForFollowUp = true;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skipNum = (pageNum - 1) * limitNum;

    const [ratings, totalCount] = await Promise.all([
      OrderRatingModel.find(filter)
        .populate("orderId")
        .populate("tableId")
        .populate("customerId")
        .populate("resolvedByStaffId")
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      OrderRatingModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      ratings,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("Get Ratings Error:", error);
    return res.status(500).json({ message: "Failed to fetch ratings" });
  }
}

/**
 * Returns rating stats for a specific MenuItem
 */
export async function getMenuItemRatings(req: Request, res: Response) {
  const menuItemId = req.params.id;
  const user = (req as any).user;

  try {
    const menuItem = await MenuItemModel.findOne({ _id: menuItemId, restaurantId: user.restaurantId });
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Query ratings referencing this MenuItem
    const ratings = await OrderRatingModel.find({
      restaurantId: user.restaurantId,
      "dishRatings.menuItemId": menuItemId,
    })
      .populate("customerId")
      .sort({ createdAt: -1 });

    // Calculate star distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const comments: any[] = [];

    ratings.forEach((r) => {
      const match = r.dishRatings.find((dr) => dr.menuItemId.toString() === menuItemId);
      if (match) {
        const star = Math.round(match.rating) as 1 | 2 | 3 | 4 | 5;
        if (star >= 1 && star <= 5) {
          distribution[star]++;
        }
        if (match.comment || (match.tags && match.tags.length > 0)) {
          comments.push({
            customerName: (r.customerId as any)?.name || "Customer",
            rating: match.rating,
            comment: match.comment || "",
            tags: match.tags || [],
            createdAt: (r as any).createdAt,
          });
        }
      }
    });

    return res.status(200).json({
      avgRating: menuItem.avgRating || 0,
      ratingCount: menuItem.ratingCount || 0,
      distribution,
      comments,
    });
  } catch (error) {
    console.error("Get Menu Item Ratings Error:", error);
    return res.status(500).json({ message: "Failed to fetch menu item ratings" });
  }
}

/**
 * Resolves a flagged low rating follow up
 */
export async function resolveFollowUp(req: Request, res: Response) {
  const ratingId = req.params.id;
  const user = (req as any).user;

  try {
    const rating = await OrderRatingModel.findOneAndUpdate(
      { _id: ratingId, restaurantId: user.restaurantId },
      {
        flaggedForFollowUp: false,
        resolvedByStaffId: user.id,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    if (!rating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    return res.status(200).json(rating);
  } catch (error) {
    console.error("Resolve Followup Error:", error);
    return res.status(500).json({ message: "Failed to resolve followup" });
  }
}

/**
 * Returns overall rating metrics, top and bottom dishes using Bayesian adjustments
 */
export async function getRatingsOverview(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const [ratings, dishes] = await Promise.all([
      OrderRatingModel.find({ restaurantId }),
      MenuItemModel.find({ restaurantId, ratingCount: { $gt: 0 } }),
    ]);

    const totalCount = ratings.length;
    const overallAverage = totalCount > 0
      ? parseFloat((ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalCount).toFixed(2))
      : 0;

    // Sort dishes using a Bayesian weight: (C * R + 5 * 3) / (C + 5)
    const getBayesianScore = (item: any) => {
      const C = item.ratingCount || 0;
      const R = item.avgRating || 0;
      return (C * R + 5 * 3) / (C + 5);
    };

    const sortedTop = [...dishes].sort((a, b) => getBayesianScore(b) - getBayesianScore(a));
    const sortedBottom = [...dishes].sort((a, b) => getBayesianScore(a) - getBayesianScore(b));

    return res.status(200).json({
      overallAverage,
      totalRatingsCount: totalCount,
      topDishes: sortedTop.slice(0, 5).map(item => ({
        _id: item._id,
        name: item.name,
        avgRating: item.avgRating,
        ratingCount: item.ratingCount,
        price: item.price
      })),
      bottomDishes: sortedBottom.slice(0, 5).map(item => ({
        _id: item._id,
        name: item.name,
        avgRating: item.avgRating,
        ratingCount: item.ratingCount,
        price: item.price
      })),
    });
  } catch (error) {
    console.error("Get Ratings Overview Error:", error);
    return res.status(500).json({ message: "Failed to load ratings overview" });
  }
}

/**
 * Returns rating submitted for a specific order by the customer
 */
export async function getRatingForOrder(req: Request, res: Response) {
  const orderId = req.params.id;
  const customer = (req as any).customer;

  try {
    const rating = await OrderRatingModel.findOne({ orderId, restaurantId: customer.restaurantId });
    return res.status(200).json(rating);
  } catch (error) {
    console.error("Get Rating For Order Error:", error);
    return res.status(500).json({ message: "Failed to fetch rating for order" });
  }
}
