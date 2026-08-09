import { Request, Response } from "express";
import { KOTModel } from "../models/KOT";
import { OrderModel } from "../models/Order";
import { emitToRestaurant } from "../socket";

export async function getKOTs(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params.restaurantId;
  const { station, status } = req.query;

  try {
    const filter: any = { restaurantId };
    if (station) filter.station = station;
    if (status) filter.status = status;

    const tickets = await KOTModel.find(filter).sort({ createdAt: 1 });
    return res.status(200).json(tickets);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch kitchen tickets" });
  }
}

export async function updateKOTStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body; // new, in_progress, ready, acknowledged
  const restaurantId = (req as any).user.restaurantId;

  try {
    const kot = await KOTModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { 
        status,
        ...(status === "ready" && { readyAt: new Date() }),
      },
      { new: true }
    );

    if (!kot) {
      return res.status(404).json({ message: "KOT ticket not found" });
    }

    // Trigger status update over Socket.IO to staff panels
    emitToRestaurant(restaurantId, "kot:statusChanged", kot);

    // Auto-transition parent order if ALL tickets for this order are ready/completed
    if (status === "ready") {
      const remainingKOTs = await KOTModel.find({ orderId: kot.orderId });
      const allReady = remainingKOTs.every((t) => t.status === "ready" || t.status === "acknowledged");
      
      if (allReady) {
        const order = await OrderModel.findOneAndUpdate(
          { _id: kot.orderId, restaurantId },
          { status: "ready" },
          { new: true }
        );

        if (order) {
          emitToRestaurant(restaurantId, "order:statusChanged", {
            orderId: order._id,
            status: "ready",
            tableId: order.tableId,
          });
        }
      }
    }

    return res.status(200).json(kot);
  } catch (error) {
    console.error("Update KOT Status Error:", error);
    return res.status(500).json({ message: "Failed to update KOT status" });
  }
}
