import { Request, Response } from "express";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { MenuItemModel } from "../models/MenuItem";
import { IngredientModel } from "../models/Ingredient";
import { KOTModel } from "../models/KOT";
import { calculateOrderTotals } from "@pos/utils";
import { emitToRestaurant, emitToStation } from "../socket";
import * as sessionService from "../services/session.service";

import {
  getCombinedIngredientsForItem,
  validateAndNormalizeReason,
  reverseItemInventory,
  PREDEFINED_CANCELLATION_REASONS,
} from "../services/cancellation.service";
import { logAuditEvent } from "../services/audit.service";

export {
  getCombinedIngredientsForItem,
  validateAndNormalizeReason,
  reverseItemInventory,
  PREDEFINED_CANCELLATION_REASONS,
};

/**
 * Builds item snapshots with validated variants, modifiers, and prices.
 */
export async function buildOrderItemsSnapshots(items: any[], restaurantId: any) {
  const orderItemsSnapshots = [];
  for (const item of items) {
    const menuItem = await MenuItemModel.findOne({ _id: item.menuItemId, restaurantId });
    if (!menuItem) {
      return { error: `Menu item ${item.menuItemId} not found`, status: 404 };
    }
    if (!menuItem.isAvailable || menuItem.isOutOfStock) {
      return { error: `Item "${menuItem.name}" is currently out of stock`, status: 400 };
    }

    // Check required variants
    const passedVariants: any[] = item.selectedVariants || (item.selectedVariant ? [item.selectedVariant] : []);
    const snapshottedVariants: any[] = [];

    if (menuItem.variantGroups && menuItem.variantGroups.length > 0) {
      for (const vg of menuItem.variantGroups) {
        if (vg.options && vg.options.length > 0) {
          const selected = passedVariants.find(
            (v: any) => v.groupName === vg.name || vg.options.some((o: any) => o.name === v.optionName)
          );

          if (!selected || !selected.optionName) {
            return {
              error: `Variant selection required for "${menuItem.name}" (${vg.name})`,
              status: 400,
            };
          }

          const matchedOption = vg.options.find((o: any) => o.name === selected.optionName);
          if (!matchedOption) {
            return {
              error: `Invalid variant option "${selected.optionName}" for "${vg.name}"`,
              status: 400,
            };
          }

          snapshottedVariants.push({
            groupName: vg.name,
            optionName: matchedOption.name,
            priceDelta: matchedOption.priceDelta || 0,
            ingredientOverrides: matchedOption.ingredientOverrides
              ? matchedOption.ingredientOverrides.map((io: any) => ({
                  ingredientId: io.ingredientId,
                  quantity: io.quantity,
                  unit: io.unit,
                }))
              : [],
          });
        }
      }
    }

    // Process modifiers
    const passedModifiers: any[] = item.selectedModifiers || [];
    const snapshottedModifiers: any[] = [];

    if (passedModifiers.length > 0 && menuItem.modifierGroups && menuItem.modifierGroups.length > 0) {
      for (const mod of passedModifiers) {
        let matchedModOption: any = null;
        let matchedGroupName = mod.groupName;

        for (const mg of menuItem.modifierGroups) {
          if (!matchedGroupName || mg.name === matchedGroupName) {
            const opt = mg.options.find((o: any) => o.name === mod.optionName);
            if (opt) {
              matchedModOption = opt;
              matchedGroupName = mg.name;
              break;
            }
          }
        }

        if (matchedModOption) {
          snapshottedModifiers.push({
            groupName: matchedGroupName || "Add-ons",
            optionName: matchedModOption.name,
            priceDelta: matchedModOption.priceDelta || 0,
            ingredients: matchedModOption.ingredients
              ? matchedModOption.ingredients.map((mi: any) => ({
                  ingredientId: mi.ingredientId,
                  quantity: mi.quantity,
                  unit: mi.unit,
                }))
              : [],
          });
        }
      }
    }

    // Calculate unit price snapshot
    let unitPrice = menuItem.price;
    for (const v of snapshottedVariants) {
      unitPrice += v.priceDelta;
    }
    for (const m of snapshottedModifiers) {
      unitPrice += m.priceDelta;
    }

    orderItemsSnapshots.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: Math.max(0, Math.round(unitPrice * 100) / 100),
      basePrice: menuItem.price,
      quantity: item.quantity,
      itemStatus: item.itemStatus || ("queued" as const),
      specialInstructions: item.specialInstructions || "",
      prepStation: menuItem.prepStation,
      selectedVariant: snapshottedVariants[0] || undefined,
      selectedVariants: snapshottedVariants,
      selectedModifiers: snapshottedModifiers,
    });
  }

  return { orderItemsSnapshots };
}

/**
 * Creates a new order scoped to a table (placed by Customer or Waiter/Staff)
 */
export async function createOrder(req: Request, res: Response) {
  const { tableId, customerId, items, notes } = req.body;
  const staffUser = (req as any).user;
  const isStaff = !!staffUser;
  const restaurantId = req.params?.restaurantId || staffUser?.restaurantId || (req as any).customer?.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const table = await TableModel.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Retrieve or open active session
    let activeSession = await sessionService.getActiveSessionForTable(tableId);
    if (!activeSession) {
      if (isStaff) {
        // Staff placing order on behalf of table opens/initializes active session
        const sessionResult = await sessionService.getOrOpenActiveSession(tableId, restaurantId);
        activeSession = sessionResult.session;
      } else {
        return res.status(400).json({
          message: "Table session is closed or has expired. Please re-scan table QR to start a fresh session.",
        });
      }
    }

    // If customer token carries a specific tableSessionId, verify it matches current active session
    const customerTokenSessionId = (req as any).customer?.tableSessionId || req.body.tableSessionId;
    if (!isStaff && customerTokenSessionId && customerTokenSessionId.toString() !== activeSession._id.toString()) {
      return res.status(400).json({
        message: "Cannot place order against a closed or outdated session. Please re-scan table QR.",
      });
    }

    // Resolve customer ID
    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const existingOrder = await OrderModel.findOne({ tableSessionId: activeSession._id, customerId: { $ne: null } });
      if (existingOrder && existingOrder.customerId) {
        effectiveCustomerId = existingOrder.customerId;
      }
    }

    // Build snapshots
    const snapshotResult = await buildOrderItemsSnapshots(items, restaurantId);
    if (snapshotResult.error) {
      return res.status(snapshotResult.status || 400).json({ message: snapshotResult.error });
    }

    const orderItemsSnapshots = snapshotResult.orderItemsSnapshots!;
    const { subtotal, tax, serviceCharge, total } = calculateOrderTotals(orderItemsSnapshots, 5, 0);

    const auditLog: any[] = isStaff
      ? [
          {
            action: "placed",
            staffId: staffUser.id,
            staffName: staffUser.name,
            timestamp: new Date(),
            note: `Order placed on behalf of ${table.label} by ${staffUser.role} ${staffUser.name}`,
          },
        ]
      : [
          {
            action: "placed",
            timestamp: new Date(),
            note: "Order placed by customer via table QR",
          },
        ];

    const newOrder = new OrderModel({
      restaurantId,
      tableId,
      tableSessionId: activeSession._id,
      customerId: effectiveCustomerId,
      items: orderItemsSnapshots,
      status: "placed",
      placedAt: new Date(),
      placedByStaffId: isStaff ? staffUser.id : undefined,
      auditLog,
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
      placedByStaffId: isStaff ? staffUser.id : undefined,
      placedByName: isStaff ? staffUser.name : "Customer",
    });

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ message: "Failed to place order" });
  }
}

/**
 * Staff edits an existing order for a table
 */
export async function editOrder(req: Request, res: Response) {
  const orderId = req.params?.id;
  const restaurantId = (req as any).user?.restaurantId;
  const staffUser = (req as any).user;
  const { items, notes } = req.body;

  try {
    const order = await OrderModel.findOne({ _id: orderId, restaurantId }).populate("tableId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["billed", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot edit an order that is already ${order.status}` });
    }

    const snapshotResult = await buildOrderItemsSnapshots(items, restaurantId);
    if (snapshotResult.error) {
      return res.status(snapshotResult.status || 400).json({ message: snapshotResult.error });
    }

    const newItems = snapshotResult.orderItemsSnapshots!;
    const { subtotal, tax, serviceCharge, total } = calculateOrderTotals(newItems, 5, 0);

    order.items = newItems as any;
    order.subtotal = subtotal;
    order.tax = tax;
    order.serviceCharge = serviceCharge;
    order.total = total;
    if (notes !== undefined) {
      order.notes = notes;
    }

    order.lastEditedByStaffId = staffUser.id as any;
    if (!order.auditLog) {
      order.auditLog = [];
    }
    order.auditLog.push({
      action: "edited",
      staffId: staffUser.id,
      staffName: staffUser.name,
      timestamp: new Date(),
      note: `Order items edited by ${staffUser.role} ${staffUser.name}`,
    });

    await order.save();

    const tableLabel = (order.tableId as any)?.label || "Table";
    emitToRestaurant(restaurantId, "order:updated", {
      orderId: order._id,
      tableId: (order.tableId as any)?._id || order.tableId,
      tableLabel,
      total: order.total,
      lastEditedByStaffId: staffUser.id,
      lastEditedByName: staffUser.name,
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error("Edit Order Error:", error);
    return res.status(500).json({ message: "Failed to edit order" });
  }
}

export async function getOrders(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params?.restaurantId;
  const { status, tableId } = req.query;

  try {
    const filter: any = { restaurantId };
    if (status) filter.status = status;
    if (tableId) filter.tableId = tableId;

    const orders = await OrderModel.find(filter)
      .populate("customerId")
      .populate("tableId")
      .populate("placedByStaffId", "name email role")
      .populate("lastEditedByStaffId", "name email role")
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
      .populate("tableId")
      .populate("placedByStaffId", "name email role")
      .populate("lastEditedByStaffId", "name email role");

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
    if (status === "cancelled") {
      if (previousStatus === "cancelled") {
        return res.status(400).json({ message: "Order is already cancelled" });
      }

      // Validate cancellation reason
      const rawReason = req.body?.reason;
      const note = req.body?.note || "";
      const reasonCheck = validateAndNormalizeReason(rawReason);
      if (!reasonCheck.isValid) {
        return res.status(400).json({
          message: reasonCheck.error || "Cancellation reason is required when cancelling an order",
        });
      }
      const validatedReason = reasonCheck.reason!;

      // Check if order was already confirmed/fired (deducted inventory), restore inventory
      const orderWasFired =
        ["confirmed", "preparing", "ready", "served", "billed"].includes(previousStatus) ||
        !!order.confirmedAt;

      const allRestoredIngredients: Array<{ ingredientId: string; name: string; quantityRestored: number; unit?: string }> = [];
      let cancelledItemsCount = 0;

      for (const item of order.items) {
        if (item.itemStatus !== "cancelled") {
          cancelledItemsCount++;
          if (orderWasFired) {
            const restored = await reverseItemInventory(item);
            allRestoredIngredients.push(...restored);
          }
          item.itemStatus = "cancelled";
        }
      }

      order.status = "cancelled";

      const staffUser = (req as any).user;
      const staffId = staffUser?.id || null;
      const staffName = staffUser ? `${staffUser.name} (${staffUser.role})` : "Staff";
      const tableLabel = (order.tableId as any)?.label || "Table";

      // 1. Generic AuditLog model entry
      await logAuditEvent({
        restaurantId,
        staffId,
        staffName,
        action: "order_cancelled",
        entityType: "order",
        entityId: order._id.toString(),
        reason: validatedReason,
        note,
        metadata: {
          orderId: order._id.toString(),
          tableId: (order.tableId as any)?._id?.toString() || order.tableId?.toString(),
          tableLabel,
          previousStatus,
          total: order.total,
          subtotal: order.subtotal,
          itemsCount: order.items.length,
          cancelledItemsCount,
          inventoryReversed: allRestoredIngredients.length > 0,
          restoredIngredients: allRestoredIngredients,
        },
      });

      // 2. Order embedded auditLog
      if (!order.auditLog) order.auditLog = [];
      order.auditLog.push({
        action: "order_cancelled",
        staffId: staffId as any,
        staffName: staffUser?.name || "Staff",
        timestamp: new Date(),
        note: `Order cancelled (${validatedReason}${note ? `: ${note}` : ""}) by ${staffUser?.role || "Staff"} ${staffUser?.name || ""}`,
      });

      if (staffUser) {
        order.lastEditedByStaffId = staffUser.id as any;
      }

      await order.save();

      // Real-time alerts to kitchen stations if KOT was sent
      if (orderWasFired) {
        const stations = Array.from(new Set(order.items.map((i) => i.prepStation || "main-kitchen")));
        const cancelPayload = {
          orderId: order._id,
          tableLabel,
          reason: validatedReason,
          note,
          cancelledAt: new Date(),
          items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, prepStation: i.prepStation })),
        };
        for (const station of stations) {
          emitToStation(restaurantId, station, "kot:orderCancelled", cancelPayload);
        }
        emitToRestaurant(restaurantId, "kot:orderCancelled", cancelPayload);
      }

      emitToRestaurant(restaurantId, "order:statusChanged", {
        orderId: order._id,
        status: order.status,
        tableId: (order.tableId as any)?._id?.toString() || order.tableId?.toString(),
      });

      return res.status(200).json(order);
    }

    if (status === "confirmed") {
      // 1. Gather all required ingredients
      const requiredIngredientsMap = new Map<string, { name: string; quantityNeeded: number }>();
      
      for (const item of order.items) {
        if (item.itemStatus === "cancelled") continue;
        const menuItem = await MenuItemModel.findById(item.menuItemId);
        const baseIngredients = menuItem?.ingredients || [];
        const variants =
          item.selectedVariants && item.selectedVariants.length > 0
            ? item.selectedVariants
            : item.selectedVariant
            ? [item.selectedVariant]
            : [];
        const modifiers = item.selectedModifiers || [];

        const combinedMap = getCombinedIngredientsForItem(baseIngredients, variants, modifiers);

        for (const [ingIdStr, perUnitQty] of combinedMap.entries()) {
          const totalQty = perUnitQty * (item.quantity || 1);
          const existing = requiredIngredientsMap.get(ingIdStr);
          if (existing) {
            existing.quantityNeeded += totalQty;
          } else {
            const ingDoc = await IngredientModel.findById(ingIdStr);
            if (ingDoc) {
              requiredIngredientsMap.set(ingIdStr, {
                name: ingDoc.name || "Unknown Ingredient",
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
            selectedVariant: i.selectedVariant,
            selectedVariants: i.selectedVariants,
            selectedModifiers: i.selectedModifiers,
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

    if (status === "served") {
      order.servedAt = new Date();
    }

    order.status = status;

    if ((req as any).user) {
      const staffUser = (req as any).user;
      order.lastEditedByStaffId = staffUser.id as any;
      if (!order.auditLog) order.auditLog = [];
      order.auditLog.push({
        action: "status_updated",
        staffId: staffUser.id,
        staffName: staffUser.name,
        timestamp: new Date(),
        note: `Order status changed to "${status}" by ${staffUser.role} ${staffUser.name}`,
      });
    }

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
 * Cancels a whole order with mandatory reason capture and inventory reversal.
 */
export async function cancelOrder(req: Request, res: Response) {
  req.body = { ...req.body, status: "cancelled" };
  return updateOrderStatus(req, res);
}

/**
 * Cancels a specific item in an order.
 * Reverses inventory deduction if KOT was already fired, recalculates order financial totals,
 * writes generic AuditLog, and pushes real-time 'kot:itemCancelled' alert to the kitchen prep station.
 */
export async function cancelOrderItem(req: Request, res: Response) {
  const targetOrderId = req.params.orderId || req.params.id;
  const itemId = req.params.itemId;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;
  const { menuItemId, itemIndex, reason: rawReason, note = "" } = req.body || {};

  try {
    // Validate mandatory cancellation reason
    const reasonCheck = validateAndNormalizeReason(rawReason);
    if (!reasonCheck.isValid) {
      return res.status(400).json({
        message: reasonCheck.error || "Cancellation reason is required",
      });
    }
    const validatedReason = reasonCheck.reason!;

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
    const orderWasFired =
      ["confirmed", "preparing", "ready", "served", "billed"].includes(order.status) || !!order.confirmedAt;
    let restoredIngredients: Array<{ ingredientId: string; name: string; quantityRestored: number; unit?: string }> = [];
    if (orderWasFired) {
      restoredIngredients = await reverseItemInventory(itemToCancel);
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
    const allItemsCancelled = activeItems.length === 0;
    if (allItemsCancelled) {
      order.status = "cancelled";
    }

    const staffUser = (req as any).user;
    const staffId = staffUser?.id || null;
    const staffName = staffUser ? `${staffUser.name} (${staffUser.role})` : "Customer / Web";
    const tableLabel = (order.tableId as any)?.label || "Table";

    // 1. Generic AuditLog model entry
    await logAuditEvent({
      restaurantId,
      staffId,
      staffName,
      action: "item_cancelled",
      entityType: "order_item",
      entityId: (itemToCancel as any)._id?.toString() || itemToCancel.menuItemId?.toString(),
      reason: validatedReason,
      note,
      metadata: {
        orderId: order._id.toString(),
        tableId: (order.tableId as any)?._id?.toString() || order.tableId?.toString(),
        tableLabel,
        menuItemId: itemToCancel.menuItemId.toString(),
        itemName: itemToCancel.name,
        quantity: itemToCancel.quantity,
        price: itemToCancel.price,
        selectedVariant: itemToCancel.selectedVariant,
        selectedVariants: itemToCancel.selectedVariants,
        selectedModifiers: itemToCancel.selectedModifiers,
        inventoryReversed: restoredIngredients.length > 0,
        restoredIngredients,
        previousOrderStatus: order.status,
      },
    });

    if (allItemsCancelled) {
      await logAuditEvent({
        restaurantId,
        staffId,
        staffName,
        action: "order_cancelled",
        entityType: "order",
        entityId: order._id.toString(),
        reason: validatedReason,
        note: note ? `All items cancelled: ${note}` : "All items in order were cancelled",
        metadata: {
          orderId: order._id.toString(),
          tableId: (order.tableId as any)?._id?.toString() || order.tableId?.toString(),
          tableLabel,
          total: order.total,
        },
      });
    }

    if (staffUser) {
      order.lastEditedByStaffId = staffUser.id as any;
    }
    if (!order.auditLog) order.auditLog = [];
    order.auditLog.push({
      action: "item_cancelled",
      staffId: staffId as any,
      staffName: staffUser?.name || "Staff",
      timestamp: new Date(),
      note: `Item "${itemToCancel.name}" cancelled (${validatedReason}${note ? `: ${note}` : ""}) by ${staffUser?.role || "Staff"} ${staffUser?.name || ""}`,
    });

    await order.save();

    // Push real-time item cancellation alert to the kitchen station if KOT was sent
    if (orderWasFired) {
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
        reason: validatedReason,
        note,
        cancelledAt: new Date(),
      };

      emitToStation(restaurantId, station, "kot:itemCancelled", cancelPayload);
      emitToRestaurant(restaurantId, "kot:itemCancelled", cancelPayload);
    }

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

