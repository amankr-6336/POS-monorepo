import { Request, Response } from "express";
import mongoose from "mongoose";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { IngredientModel } from "../models/Ingredient";

/**
 * Returns summary statistics of the restaurant business
 */
export async function getSummary(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const stats = await OrderModel.aggregate([
      { 
        $match: { 
          restaurantId: new mongoose.Types.ObjectId(restaurantId), 
          status: { $ne: "cancelled" } 
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ["$status", ["served", "billed"]] },
                "$total",
                0
              ]
            }
          },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = stats.length > 0 ? parseFloat(stats[0].totalRevenue.toFixed(2)) : 0;
    const totalOrders = stats.length > 0 ? stats[0].totalOrders : 0;
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;

    const totalTablesCount = await TableModel.countDocuments({ restaurantId });
    const occupiedTablesCount = await TableModel.countDocuments({ restaurantId, status: "occupied" });
    const occupancyRate = totalTablesCount > 0 ? parseFloat(((occupiedTablesCount / totalTablesCount) * 100).toFixed(1)) : 0;

    const lowStockCount = await IngredientModel.countDocuments({
      restaurantId,
      $expr: { $lte: ["$currentStock", "$lowStockThreshold"] }
    });

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      occupancyRate,
      activeTables: occupiedTablesCount,
      totalTables: totalTablesCount,
      lowStockCount
    });
  } catch (error) {
    console.error("Get Analytics Summary Error:", error);
    return res.status(500).json({ message: "Failed to load summary statistics" });
  }
}

/**
 * Returns revenue and order volume trends over a specific time period (7days, 30days, 12months)
 */
export async function getRevenueChart(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;
  const period = req.query.period || "7days";

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const now = new Date();
    let startDate = new Date();
    let matchStage: any = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      status: { $in: ["served", "billed"] }
    };

    if (period === "7days") {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      matchStage.placedAt = { $gte: startDate };

      const data = await OrderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const found = data.find((item) => item._id === dateStr);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        result.push({
          date: dateStr,
          label,
          revenue: found ? parseFloat(found.revenue.toFixed(2)) : 0,
          orders: found ? found.orders : 0
        });
      }
      return res.status(200).json(result);
    } 
    
    if (period === "30days") {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      matchStage.placedAt = { $gte: startDate };

      const data = await OrderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const found = data.find((item) => item._id === dateStr);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        result.push({
          date: dateStr,
          label,
          revenue: found ? parseFloat(found.revenue.toFixed(2)) : 0,
          orders: found ? found.orders : 0
        });
      }
      return res.status(200).json(result);
    } 
    
    if (period === "12months") {
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      matchStage.placedAt = { $gte: startDate };

      const data = await OrderModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$placedAt" } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const found = data.find((item) => item._id === monthStr);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        result.push({
          date: monthStr,
          label,
          revenue: found ? parseFloat(found.revenue.toFixed(2)) : 0,
          orders: found ? found.orders : 0
        });
      }
      return res.status(200).json(result);
    }

    return res.status(400).json({ message: "Invalid period type" });
  } catch (error) {
    console.error("Get Analytics Revenue Chart Error:", error);
    return res.status(500).json({ message: "Failed to load sales trends" });
  }
}

/**
 * Returns popular menu items ranked by quantities ordered
 */
export async function getPopularItems(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const popularItems = await OrderModel.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $ne: "cancelled" }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.menuItemId",
          name: { $first: "$items.name" },
          price: { $first: "$items.price" },
          quantitySold: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 }
    ]);

    const formatted = popularItems.map(item => ({
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      quantitySold: item.quantitySold,
      orderCount: item.orderCount,
      revenue: parseFloat(item.revenue.toFixed(2))
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Get Analytics Popular Items Error:", error);
    return res.status(500).json({ message: "Failed to load popular menu items" });
  }
}

/**
 * Returns order breakdown counts by order status
 */
export async function getOrderStatusBreakdown(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const breakdown = await OrderModel.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId)
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statuses = ["placed", "confirmed", "preparing", "ready", "served", "billed", "cancelled"];
    const result = statuses.map((status) => {
      const found = breakdown.find((item) => item._id === status);
      return {
        status,
        count: found ? found.count : 0
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Analytics Order Status Breakdown Error:", error);
    return res.status(500).json({ message: "Failed to load status distributions" });
  }
}

/**
 * Returns order count and revenue aggregated by hour of the day
 */
export async function getBusyHours(req: Request, res: Response) {
  const restaurantId = req.params.id;
  const user = (req as any).user;

  if (user?.restaurantId !== restaurantId) {
    return res.status(403).json({ message: "Access forbidden: tenant mismatch" });
  }

  try {
    const hourlyData = await OrderModel.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $ne: "cancelled" }
        }
      },
      {
        $group: {
          _id: { $hour: "$placedAt" },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = [];
    // Full 24 hours distribution
    for (let hour = 0; hour < 24; hour++) {
      const found = hourlyData.find((item) => item._id === hour);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${displayHour} ${ampm}`;
      result.push({
        hour,
        label,
        orders: found ? found.orders : 0,
        revenue: found ? parseFloat(found.revenue.toFixed(2)) : 0
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Analytics Busy Hours Error:", error);
    return res.status(500).json({ message: "Failed to load peak times analysis" });
  }
}
