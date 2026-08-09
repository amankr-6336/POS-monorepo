import { Request, Response } from "express";
import { TableQueryModel } from "../models/TableQuery";
import { TableModel } from "../models/Table";
import { emitToRestaurant } from "../socket";

export async function createTableQuery(req: Request, res: Response) {
  const { tableId } = req.body;
  const restaurantId = req.params.restaurantId || (req as any).customer?.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const table = await TableModel.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Check if there is already an open query for this table
    let activeQuery = await TableQueryModel.findOne({ tableId, restaurantId, status: "open" });
    if (activeQuery) {
      return res.status(200).json(activeQuery);
    }

    activeQuery = new TableQueryModel({
      restaurantId,
      tableId,
      raisedAt: new Date(),
      status: "open",
    });

    await activeQuery.save();

    // Broadcast table query alert to all waiter/staff devices on Socket.IO
    emitToRestaurant(restaurantId, "tableQuery:new", {
      queryId: activeQuery._id,
      tableId: table._id,
      tableLabel: table.label,
      location: table.location,
      raisedAt: activeQuery.raisedAt,
    });

    return res.status(201).json(activeQuery);
  } catch (error) {
    console.error("Create Table Query Error:", error);
    return res.status(500).json({ message: "Failed to request waiter assistance" });
  }
}

export async function getActiveQueries(req: Request, res: Response) {
  const restaurantId = (req as any).user.restaurantId;
  try {
    const queries = await TableQueryModel.find({ restaurantId, status: "open" })
      .populate("tableId")
      .sort({ raisedAt: 1 });

    const formattedQueries = queries.map((q) => ({
      _id: q._id,
      restaurantId: q.restaurantId,
      tableId: (q.tableId as any)?._id,
      tableLabel: (q.tableId as any)?.label,
      location: (q.tableId as any)?.location,
      raisedAt: q.raisedAt,
      status: q.status,
    }));

    return res.status(200).json(formattedQueries);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch queries" });
  }
}

export async function resolveTableQuery(req: Request, res: Response) {
  const { id } = req.params;
  const restaurantId = (req as any).user.restaurantId;
  const staffId = (req as any).user.id;

  try {
    const query = await TableQueryModel.findOneAndUpdate(
      { _id: id, restaurantId, status: "open" },
      {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedByStaffId: staffId,
      },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({ message: "Query not found or already resolved" });
    }

    // Broadcast resolve signal to clear alert on other staff devices
    emitToRestaurant(restaurantId, "tableQuery:resolved", { queryId: query._id });

    return res.status(200).json({ message: "Query resolved successfully", query });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve query" });
  }
}
