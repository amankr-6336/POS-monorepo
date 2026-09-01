import { Types } from "mongoose";
import { TableSessionModel } from "../models/TableSession";
import { TableModel } from "../models/Table";
import { RestaurantModel } from "../models/Restaurant";

/**
 * Checks if the table's currently active session has exceeded the restaurant's inactivity timeout.
 * If expired, automatically closes the session and transitions the table status to 'needs_cleaning'.
 */
export async function checkAndExpireTableSession(tableId: string | Types.ObjectId) {
  const activeSession = await TableSessionModel.findOne({ tableId, status: "active" });
  if (!activeSession) {
    return null;
  }

  const restaurant = await RestaurantModel.findById(activeSession.restaurantId);
  const timeoutMinutes = restaurant?.tableSessionTimeoutMinutes ?? 180; // default 3 hours (180 mins)

  const lastActivityTime = new Date(activeSession.lastActivityAt || activeSession.openedAt).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - lastActivityTime) / (1000 * 60);

  if (elapsedMinutes >= timeoutMinutes) {
    // Auto-expire session
    activeSession.status = "closed";
    activeSession.closedAt = new Date();
    activeSession.closedByStaffId = null; // Auto-expired, not manual staff close
    await activeSession.save();

    // Transition table to needs_cleaning
    await TableModel.findByIdAndUpdate(tableId, {
      status: "needs_cleaning",
      currentSessionId: null,
    });

    return { expired: true, session: activeSession };
  }

  return { expired: false, session: activeSession };
}

/**
 * Retrieves the currently active session for a table or creates a new one on QR scan.
 * Handles automatic expiry before checking/creating.
 * Transitions table status to 'occupied' when opening a session.
 */
export async function getOrOpenActiveSession(
  tableId: string | Types.ObjectId,
  restaurantId: string | Types.ObjectId
) {
  // First check if an existing session needs to auto-expire
  await checkAndExpireTableSession(tableId);

  // Look for any active session
  let session = await TableSessionModel.findOne({ tableId, restaurantId, status: "active" });

  if (session) {
    return { session, isNew: false };
  }

  // Open fresh session
  session = new TableSessionModel({
    tableId,
    restaurantId,
    status: "active",
    openedAt: new Date(),
    lastActivityAt: new Date(),
  });
  await session.save();

  // Transition table status to occupied and link active session
  await TableModel.findByIdAndUpdate(tableId, {
    status: "occupied",
    currentSessionId: session._id,
  });

  return { session, isNew: true };
}

/**
 * Manually closes a table session (e.g. staff marks cleared/closed).
 * Records closedByStaffId and transitions table status to 'needs_cleaning'.
 */
export async function closeTableSession(
  tableId: string | Types.ObjectId,
  restaurantId: string | Types.ObjectId,
  staffId?: string | Types.ObjectId | null
) {
  const activeSession = await TableSessionModel.findOne({ tableId, restaurantId, status: "active" });
  if (activeSession) {
    activeSession.status = "closed";
    activeSession.closedAt = new Date();
    activeSession.closedByStaffId = (staffId as any) || null;
    await activeSession.save();
  }

  const table = await TableModel.findOneAndUpdate(
    { _id: tableId, restaurantId },
    {
      status: "needs_cleaning",
      currentSessionId: null,
    },
    { new: true }
  );

  return { session: activeSession, table };
}

/**
 * Resets a table to 'available' (after staff cleans/resets it).
 * Closes any lingering active session and clears current session/order references.
 */
export async function resetTableToAvailable(
  tableId: string | Types.ObjectId,
  restaurantId: string | Types.ObjectId,
  staffId?: string | Types.ObjectId | null
) {
  const activeSession = await TableSessionModel.findOne({ tableId, restaurantId, status: "active" });
  if (activeSession) {
    activeSession.status = "closed";
    activeSession.closedAt = new Date();
    activeSession.closedByStaffId = (staffId as any) || null;
    await activeSession.save();
  }

  const table = await TableModel.findOneAndUpdate(
    { _id: tableId, restaurantId },
    {
      status: "available",
      currentSessionId: null,
      currentOrderId: null,
    },
    { new: true }
  );

  return table;
}

/**
 * Updates lastActivityAt on the session whenever orders or table actions occur.
 */
export async function recordSessionActivity(sessionId: string | Types.ObjectId) {
  return TableSessionModel.findByIdAndUpdate(sessionId, {
    lastActivityAt: new Date(),
  });
}

/**
 * Returns the currently active session for a table (null if none or expired).
 */
export async function getActiveSessionForTable(tableId: string | Types.ObjectId) {
  const result = await checkAndExpireTableSession(tableId);
  if (!result || result.expired) {
    return null;
  }
  return result.session;
}
