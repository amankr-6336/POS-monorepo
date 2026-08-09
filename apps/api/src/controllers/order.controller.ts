import { Request, Response } from "express";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { MenuItemModel } from "../models/MenuItem";
import { IngredientModel } from "../models/Ingredient";
import { KOTModel } from "../models/KOT";
import { calculateOrderTotals } from "@pos/utils";
import { emitToRestaurant, emitToStation } from "../socket";

/**
 * Customer places a new order scoped to a table
 */
export async function createOrder(req: Request, res: Response) {
  const { tableId, customerId, items, notes } = req.body;
  const restaurantId = req.params.restaurantId || (req as any).customer?.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const table = await TableModel.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Capture snapshots of items at order time
    const orderItemsSnapshots = [];
    for (const item of items) {
      const menuItem = await MenuItemModel.findOne({ _id: item.menuItemId, restaurantId });
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item ${item.menuItemId} not found` });
      }
      if (!menuItem.isAvailable || menuItem.isOutOfStock) {
        return res.status(400).json({ message: `Item "${menuItem.name}" is currently out of stock` });
      }
      orderItemsSnapshots.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        itemStatus: "queued" as const,
        specialInstructions: item.specialInstructions || "",
        prepStation: menuItem.prepStation,
      });
    }

    // Calculate totals
    const { subtotal, tax, serviceCharge, total } = calculateOrderTotals(orderItemsSnapshots, 5, 0);

    const newOrder = new OrderModel({
      restaurantId,
      tableId,
      customerId,
      items: orderItemsSnapshots,
      status: "placed",
      placedAt: new Date(),
      subtotal,
      tax,
      serviceCharge,
      total,
      notes: notes || "",
    });

    await newOrder.save();

    // Lock table status to occupied and associate current order
    table.status = "occupied";
    table.currentOrderId = newOrder._id as string;
    await table.save();

    // Notify staff dashboard in real time
    emitToRestaurant(restaurantId, "order:new", {
      orderId: newOrder._id,
      tableLabel: table.label,
      total: newOrder.total,
    });

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ message: "Failed to place order" });
  }
}

export async function getOrders(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params.restaurantId;
  const { status, tableId } = req.query;

  try {
    const filter: any = { restaurantId };
    if (status) filter.status = status;
    if (tableId) filter.tableId = tableId;

    const orders = await OrderModel.find(filter)
      .populate("customerId")
      .populate("tableId")
      .sort({ placedAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
}

export async function getOrderById(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;

  try {
    const order = await OrderModel.findOne({ _id: id, restaurantId })
      .populate("customerId")
      .populate("tableId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch order details" });
  }
}

/**
 * Updates order status & triggers transitions (Deduction -> KOT -> Preparing -> Served -> Billed)
 */
export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const order = await OrderModel.findOne({ _id: id, restaurantId }).populate("tableId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.status;
    if (previousStatus === status) {
      return res.status(200).json(order);
    }

    // STATE TRANSITION FLOW LOGIC
    if (status === "confirmed") {
      // 1. Gather all required ingredients
      const requiredIngredientsMap = new Map<string, { name: string; quantityNeeded: number }>();
      
      for (const item of order.items) {
        const menuItem = await MenuItemModel.findById(item.menuItemId).populate("ingredients.ingredientId");
        if (menuItem && menuItem.ingredients.length > 0) {
          for (const ing of menuItem.ingredients) {
            const ingIdStr = (ing.ingredientId as any)._id?.toString() || ing.ingredientId.toString();
            const totalQty = ing.quantity * item.quantity;
            
            const existing = requiredIngredientsMap.get(ingIdStr);
            if (existing) {
              existing.quantityNeeded += totalQty;
            } else {
              const ingDoc = await IngredientModel.findById(ing.ingredientId);
              requiredIngredientsMap.set(ingIdStr, {
                name: ingDoc?.name || "Unknown Ingredient",
                quantityNeeded: totalQty,
              });
            }
          }
        }
      }

      // 2. Validate current stock limits
      const stockErrors: string[] = [];
      for (const [ingId, reqIng] of requiredIngredientsMap.entries()) {
        const ingredient = await IngredientModel.findById(ingId);
        if (!ingredient || ingredient.currentStock < reqIng.quantityNeeded) {
          stockErrors.push(
            `Insufficient stock for "${reqIng.name}". Needed: ${reqIng.quantityNeeded}${ingredient?.unit || ""}, Available: ${ingredient?.currentStock || 0}`
          );
        }
      }

      if (stockErrors.length > 0) {
        return res.status(400).json({
          message: "Inventory stock validation failed. Cannot confirm order.",
          errors: stockErrors,
        });
      }

      // 3. Deduct stock atomically
      for (const [ingId, reqIng] of requiredIngredientsMap.entries()) {
        await IngredientModel.findByIdAndUpdate(ingId, {
          $inc: { currentStock: -reqIng.quantityNeeded },
        });
      }

      // 4. Generate Kitchen Order Tickets (KOT) grouped by prepStation
      const stationGroups: { [station: string]: typeof order.items } = {};
      order.items.forEach((item) => {
        const station = item.prepStation || "main-kitchen";
        if (!stationGroups[station]) stationGroups[station] = [];
        stationGroups[station].push(item);
      });

      const tableLabel = (order.tableId as any)?.label || "Table";

      for (const [station, items] of Object.entries(stationGroups)) {
        const newKOT = new KOTModel({
          restaurantId,
          orderId: order._id,
          tableLabel,
          station,
          items: items.map((i) => ({
            menuItemName: i.name,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions,
          })),
          status: "new",
          createdAt: new Date(),
        });
        await newKOT.save();

        // Emit real-time KOT push to kitchen station screens
        emitToStation(restaurantId, station, "kot:new", newKOT);
      }

      order.confirmedAt = new Date();
    }

    // If order was confirmed and is now being cancelled, revert inventory stock
    if (status === "cancelled" && ["confirmed", "preparing", "ready", "served"].includes(previousStatus)) {
      for (const item of order.items) {
        const menuItem = await MenuItemModel.findById(item.menuItemId);
        if (menuItem) {
          for (const ing of menuItem.ingredients) {
            await IngredientModel.findByIdAndUpdate(ing.ingredientId, {
              $inc: { currentStock: ing.quantity * item.quantity },
            });
          }
        }
      }
      
      // Cancel table assignment if needed
      await TableModel.findByIdAndUpdate(order.tableId, { status: "available", currentOrderId: null });
    }

    if (status === "served") {
      order.servedAt = new Date();
    }

    order.status = status;
    await order.save();

    // Trigger status sync for customer app tracker and waiter panels
    emitToRestaurant(restaurantId, "order:statusChanged", {
      orderId: order._id,
      status: order.status,
      tableId: (order.tableId as any)._id?.toString() || order.tableId.toString(),
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error("Update Order Status Error:", error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
}
