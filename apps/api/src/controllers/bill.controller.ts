import { Request, Response } from "express";
import { BillModel } from "../models/Bill";
import { OrderModel } from "../models/Order";
import { TableModel } from "../models/Table";

export async function generateBill(req: Request, res: Response) {
  const { orderId } = req.params;
  const restaurantId = (req as any).user.restaurantId;

  try {
    const order = await OrderModel.findOne({ _id: orderId, restaurantId }).populate("tableId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if bill already exists for this order
    let bill = await BillModel.findOne({ orderId, restaurantId });
    if (bill) {
      return res.status(200).json(bill);
    }

    const tableLabel = (order.tableId as any)?.label || "Table";

    bill = new BillModel({
      restaurantId,
      orderId: order._id,
      tableLabel,
      items: order.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      serviceCharge: order.serviceCharge || 0,
      total: order.total,
      generatedAt: new Date(),
      paymentStatus: "pending",
    });

    await bill.save();

    // Transition Order status to billed
    order.status = "billed";
    await order.save();

    return res.status(201).json(bill);
  } catch (error) {
    console.error("Generate Bill Error:", error);
    return res.status(500).json({ message: "Failed to generate bill" });
  }
}

export async function getBillByOrderId(req: Request, res: Response) {
  const { orderId } = req.params;
  const restaurantId = (req as any).user?.restaurantId || (req as any).customer?.restaurantId;

  try {
    const bill = await BillModel.findOne({ orderId, restaurantId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    return res.status(200).json(bill);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bill" });
  }
}

/**
 * Settles payment (external cash/card machine) and frees the table session
 */
export async function settleBillPayment(req: Request, res: Response) {
  const { id } = req.params; // bill ID
  const restaurantId = (req as any).user.restaurantId;

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
    const order = await OrderModel.findById(bill.orderId);
    if (order) {
      await TableModel.findByIdAndUpdate(order.tableId, {
        status: "needs_cleaning",
        currentOrderId: null,
      });
    }

    return res.status(200).json({
      message: "Bill settled. Table status updated to needs cleaning.",
      bill,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to settle payment" });
  }
}
