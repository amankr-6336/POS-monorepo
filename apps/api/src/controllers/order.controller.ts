import { Request, Response } from "express";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { MenuItemModel } from "../models/MenuItem";
import { IngredientModel } from "../models/Ingredient";
import { KOTModel } from "../models/KOT";
import { calculateOrderTotals } from "@pos/utils";
import { emitToRestaurant, emitToStation } from "../socket";
import * as sessionService from "../services/session.service";

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

    // Validate that the table has an active session and is not expired or closed
    const activeSession = await sessionService.getActiveSessionForTable(tableId);
    if (!activeSession) {
      return res.status(400).json({
        message: "Table session is closed or has expired. Please re-scan table QR to start a fresh session.",
      });
    }

    // If customer token carries a specific tableSessionId, verify it matches current active session
    const customerTokenSessionId = (req as any).customer?.tableSessionId || req.body.tableSessionId;
    if (customerTokenSessionId && customerTokenSessionId.toString() !== activeSession._id.toString()) {
      return res.status(400).json({
        message: "Cannot place order against a closed or outdated session. Please re-scan table QR.",
      });
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
      tableSessionId: activeSession._id,
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

    // Lock table status to occupied, link session and associate current order
    table.status = "occupied";
    table.currentSessionId = activeSession._id as any;
    table.currentOrderId = newOrder._id as string;
    await table.save();

    // Record activity timestamp on session
    await sessionService.recordSessionActivity(activeSession._id);

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
        if (item.itemStatus === "cancelled") continue;
        const menuItem = await MenuItemModel.findById(item.menuItemId);
        if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
          for (const ing of menuItem.ingredients) {
            if (!ing || !ing.ingredientId) continue;
            const ingIdStr = ing.ingredientId.toString();
            const totalQty = (ing.quantity || 1) * (item.quantity || 1);
            
            const existing = requiredIngredientsMap.get(ingIdStr);
            if (existing) {
              existing.quantityNeeded += totalQty;
            } else {
              const ingDoc = await IngredientModel.findById(ing.ingredientId);
              if (ingDoc) {
                requiredIngredientsMap.set(ingIdStr, {
                  name: ingDoc.name || "Unknown Ingredient",
                  quantityNeeded: totalQty,
                });
              }
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
        if (item.itemStatus !== "cancelled") {
          const station = item.prepStation || "main-kitchen";
          if (!stationGroups[station]) stationGroups[station] = [];
          stationGroups[station].push(item);
        }
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
    if (status === "cancelled" && ["confirmed", "preparing", "ready", "served", "billed"].includes(previousStatus)) {
      for (const item of order.items) {
        if (item.itemStatus === "cancelled") continue;
        const menuItem = await MenuItemModel.findById(item.menuItemId);
        if (menuItem && menuItem.ingredients) {
          for (const ing of menuItem.ingredients) {
            if (ing && ing.ingredientId) {
              await IngredientModel.findByIdAndUpdate(ing.ingredientId, {
                $inc: { currentStock: (ing.quantity || 1) * (item.quantity || 1) },
              });
            }
          }
        }
      }
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

/**
 * Cancels a specific item in an order.
 * Reverses inventory deduction if KOT was already fired, recalculates order financial totals,
 * and pushes real-time 'kot:itemCancelled' alert to the kitchen prep station.
 */
export async function cancelOrderItem(req: Request, res: Response) {
  const targetOrderId = req.params.orderId || req.params.id;
  const itemId = req.params.itemId;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;
  const { menuItemId, itemIndex, reason } = req.body || {};

  try {
    const order = await OrderModel.findOne({ _id: targetOrderId, restaurantId }).populate("tableId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    // Find the item to cancel
    let targetItemIndex = -1;
    if (itemId) {
      targetItemIndex = order.items.findIndex(
        (i: any) => i._id?.toString() === itemId || i.menuItemId?.toString() === itemId
      );
    } else if (itemIndex !== undefined && itemIndex >= 0 && itemIndex < order.items.length) {
      targetItemIndex = itemIndex;
    } else if (menuItemId) {
      targetItemIndex = order.items.findIndex(
        (i: any) => i.menuItemId?.toString() === menuItemId && i.itemStatus !== "cancelled"
      );
    }

    if (targetItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in this order" });
    }

    const itemToCancel = order.items[targetItemIndex];
    if (itemToCancel.itemStatus === "cancelled") {
      return res.status(400).json({ message: "Item is already cancelled" });
    }

    // If order was already confirmed/fired (deducted inventory), restore inventory
    const orderWasFired = ["confirmed", "preparing", "ready", "served", "billed"].includes(order.status) || !!order.confirmedAt;
    if (orderWasFired) {
      const menuItem = await MenuItemModel.findById(itemToCancel.menuItemId);
      if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
        for (const ing of menuItem.ingredients) {
          await IngredientModel.findByIdAndUpdate(ing.ingredientId, {
            $inc: { currentStock: ing.quantity * itemToCancel.quantity },
          });
        }
      }
    }

    // Mark item status as cancelled
    itemToCancel.itemStatus = "cancelled";

    // Recalculate order financial totals based on active items
    const activeItems = order.items.filter((i) => i.itemStatus !== "cancelled");
    const { subtotal, tax, serviceCharge, total } = calculateOrderTotals(activeItems, 5, 0);
    order.subtotal = subtotal;
    order.tax = tax;
    order.serviceCharge = serviceCharge;
    order.total = total;

    // If all items are cancelled, mark the entire order as cancelled
    if (activeItems.length === 0) {
      order.status = "cancelled";
    }

    await order.save();

    // Push real-time item cancellation alert to the kitchen station
    const tableLabel = (order.tableId as any)?.label || "Table";
    const station = itemToCancel.prepStation || "main-kitchen";
    const cancelPayload = {
      orderId: order._id,
      tableLabel,
      station,
      item: {
        menuItemId: itemToCancel.menuItemId,
        name: itemToCancel.name,
        quantity: itemToCancel.quantity,
        specialInstructions: itemToCancel.specialInstructions,
      },
      reason: reason || "Item cancelled by staff/customer",
      cancelledAt: new Date(),
    };

    emitToStation(restaurantId, station, "kot:itemCancelled", cancelPayload);
    emitToRestaurant(restaurantId, "kot:itemCancelled", cancelPayload);
    emitToRestaurant(restaurantId, "order:statusChanged", {
      orderId: order._id,
      status: order.status,
      tableId: (order.tableId as any)?._id?.toString() || order.tableId?.toString(),
    });

    return res.status(200).json({
      message: `Item "${itemToCancel.name}" cancelled successfully.`,
      order,
      cancelledItem: itemToCancel,
    });
  } catch (error) {
    console.error("Cancel Order Item Error:", error);
    return res.status(500).json({ message: "Failed to cancel order item" });
  }
}
