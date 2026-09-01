import { Request, Response } from "express";
import { BillModel } from "../models/Bill";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";
import { TableSessionModel } from "../models/TableSession";
import { calculateOrderTotals } from "@pos/utils";
import * as sessionService from "../services/session.service";

/**
 * Generates or updates a consolidated bill aggregating all non-cancelled orders in a TableSession.
 */
export async function generateBill(req: Request, res: Response) {
  const { orderId, sessionId } = req.params || {};
  const targetSessionId = sessionId || req.body?.sessionId;
  const targetOrderId = orderId || req.body?.orderId;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;

  try {
    let orders: any[] = [];
    let activeSessionId: any = targetSessionId;

    if (targetOrderId) {
      const primaryOrder = await OrderModel.findOne({ _id: targetOrderId, restaurantId }).populate("tableId");
      if (!primaryOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (primaryOrder.tableSessionId) {
        activeSessionId = primaryOrder.tableSessionId;
        orders = await OrderModel.find({
          tableSessionId: primaryOrder.tableSessionId,
          restaurantId,
          status: { $ne: "cancelled" },
        }).populate("tableId");
      } else {
        orders = primaryOrder.status !== "cancelled" ? [primaryOrder] : [];
      }
    } else if (targetSessionId) {
      orders = await OrderModel.find({
        tableSessionId: targetSessionId,
        restaurantId,
        status: { $ne: "cancelled" },
      }).populate("tableId");
    }

    if (orders.length === 0) {
      return res.status(400).json({ message: "No active orders found to generate bill" });
    }

    // Aggregate all active items (itemStatus !== 'cancelled') across all order rounds
    const aggregatedItems: any[] = [];
    for (const ord of orders) {
      for (const item of ord.items) {
        if (item.itemStatus !== "cancelled") {
          aggregatedItems.push({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
            prepStation: item.prepStation,
          });
        }
      }
    }

    if (aggregatedItems.length === 0) {
      return res.status(400).json({ message: "All items in the session orders have been cancelled" });
    }

    // Calculate consolidated math across all items
    const { subtotal, tax, serviceCharge, total } = calculateOrderTotals(aggregatedItems, 5, 0);

    const primaryOrder = orders[0];
    const tableLabel = (primaryOrder.tableId as any)?.label || "Table";
    const orderIds = orders.map((o) => o._id);

    // Look for existing bill for this session or primary order
    let bill = activeSessionId
      ? await BillModel.findOne({ tableSessionId: activeSessionId, restaurantId })
      : await BillModel.findOne({ orderId: primaryOrder._id, restaurantId });

    if (bill) {
      bill.items = aggregatedItems;
      bill.subtotal = subtotal;
      bill.tax = tax;
      bill.serviceCharge = serviceCharge;
      bill.total = total;
      bill.orderIds = orderIds;
      bill.tableLabel = tableLabel;
      await bill.save();
    } else {
      bill = new BillModel({
        restaurantId,
        tableSessionId: activeSessionId || undefined,
        orderId: primaryOrder._id,
        orderIds,
        tableLabel,
        items: aggregatedItems,
        subtotal,
        tax,
        serviceCharge,
        total,
        generatedAt: new Date(),
        paymentStatus: "pending",
      });
      await bill.save();
    }

    // Transition all included orders to 'billed' status
    for (const o of orders) {
      if (o.status !== "billed") {
        o.status = "billed";
        await o.save();
      }
    }

    return res.status(201).json(bill);
  } catch (error) {
    console.error("Generate Bill Error:", error);
    return res.status(500).json({ message: "Failed to generate bill" });
  }
}

/**
 * Retrieves the consolidated bill associated with an order or its TableSession.
 */
export async function getBillByOrderId(req: Request, res: Response) {
  const { orderId } = req.params;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;

  try {
    const order = await OrderModel.findOne({ _id: orderId, restaurantId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let bill = null;
    if (order.tableSessionId) {
      bill = await BillModel.findOne({
        $or: [{ tableSessionId: order.tableSessionId }, { orderId: order._id }],
        restaurantId,
      });
    } else {
      bill = await BillModel.findOne({ orderId, restaurantId });
    }

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    return res.status(200).json(bill);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bill" });
  }
}

/**
 * Retrieves the consolidated bill for a TableSession directly.
 */
export async function getSessionBill(req: Request, res: Response) {
  const { sessionId } = req.params;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;

  try {
    const bill = await BillModel.findOne({ tableSessionId: sessionId, restaurantId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found for this session" });
    }
    return res.status(200).json(bill);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch session bill" });
  }
}

/**
 * Settles payment (external cash/card machine) and frees the table session
 */
export async function settleBillPayment(req: Request, res: Response) {
  const { id } = req.params; // bill ID
  const restaurantId = (req as any).user.restaurantId;
  const staffId = (req as any).user?.id;

  try {
    const bill = await BillModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { paymentStatus: "settled_externally" },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Free the table session and mark as needs_cleaning
    if (bill.tableSessionId) {
      const session = await TableSessionModel.findById(bill.tableSessionId);
      if (session) {
        await sessionService.closeTableSession(session.tableId, restaurantId, staffId);
        await TableModel.findByIdAndUpdate(session.tableId, { currentOrderId: null });
      }
    } else if (bill.orderId) {
      const order = await OrderModel.findById(bill.orderId);
      if (order) {
        await sessionService.closeTableSession(order.tableId, restaurantId, staffId);
        await TableModel.findByIdAndUpdate(order.tableId, { currentOrderId: null });
      }
    }

    return res.status(200).json({
      message: "Bill settled. Table status updated to needs cleaning.",
      bill,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to settle payment" });
  }
}
