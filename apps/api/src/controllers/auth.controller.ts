import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StaffUserModel } from "../models/StaffUser";
import { RestaurantModel } from "../models/Restaurant";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_pos_jwt_key_991823";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super_secret_pos_refresh_jwt_key_882910";

export async function loginStaff(req: Request, res: Response) {
  const { email, password } = req.body;
  try {
    const staff = await StaffUserModel.findOne({ email });
    if (!staff || !staff.isActive) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const restaurant = await RestaurantModel.findById(staff.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(403).json({ message: "Restaurant account is suspended or inactive" });
    }

    const payload = {
      id: staff._id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      name: staff.name,
      assignedStation: staff.assignedStation,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
    const refreshToken = jwt.sign({ id: staff._id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurantId: staff.restaurantId,
        assignedStation: staff.assignedStation,
        hasPin: !!staff.pinHash,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function registerStaff(req: Request, res: Response) {
  const { name, email, password, pin, role, assignedStation } = req.body;
  // Express middleware handles injecting restaurantId or owner controls it
  const restaurantId = (req as any).user?.restaurantId || req.body.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const existing = await StaffUserModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : undefined;

    const newStaff = new StaffUserModel({
      restaurantId,
      name,
      email,
      passwordHash,
      pinHash,
      role,
      assignedStation,
      isActive: true,
    });

    await newStaff.save();

    return res.status(201).json({
      message: "Staff member registered successfully",
      user: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        restaurantId: newStaff.restaurantId,
        hasPin: !!pinHash,
      },
    });
  } catch (error) {
    console.error("Staff Registration Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function refreshStaffToken(req: Request, res: Response) {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    const staff = await StaffUserModel.findById(decoded.id);

    if (!staff || !staff.isActive) {
      return res.status(401).json({ message: "Invalid or inactive staff session" });
    }

    const payload = {
      id: staff._id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      name: staff.name,
      assignedStation: staff.assignedStation,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

export function logoutStaff(req: Request, res: Response) {
  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out successfully" });
}

/**
 * Returns active staff members for a restaurant (for terminal staff switcher)
 */
export async function getRestaurantStaffList(req: Request, res: Response) {
  const restaurantId = (req as any).user?.restaurantId || req.params.restaurantId || req.params.id;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    const staffList = await StaffUserModel.find({ restaurantId, isActive: true })
      .select("_id name email role assignedStation pinHash pinLockedUntil")
      .sort({ name: 1 });

    const now = new Date();
    const safeList = staffList.map((s) => {
      const isLocked = Boolean(s.pinLockedUntil && new Date(s.pinLockedUntil).getTime() > now.getTime());
      return {
        _id: s._id,
        name: s.name,
        email: s.email,
        role: s.role,
        assignedStation: s.assignedStation,
        hasPin: !!s.pinHash,
        isLocked,
        lockedUntil: isLocked ? s.pinLockedUntil : null,
      };
    });

    return res.status(200).json(safeList);
  } catch (error) {
    console.error("Get Staff List Error:", error);
    return res.status(500).json({ message: "Failed to fetch staff members" });
  }
}

/**
 * Set or update a 4-6 digit PIN for staff
 */
export async function setStaffPin(req: Request, res: Response) {
  const currentStaff = (req as any).user;
  const { staffId, pin } = req.body;
  const targetId = staffId || currentStaff.id;

  // Non-owners/managers can only configure their own PIN
  if (targetId !== currentStaff.id && !["owner", "manager"].includes(currentStaff.role)) {
    return res.status(403).json({ message: "You can only configure your own PIN" });
  }

  try {
    const staff = await StaffUserModel.findOne({ _id: targetId, restaurantId: currentStaff.restaurantId });
    if (!staff || !staff.isActive) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    staff.pinHash = await bcrypt.hash(pin, 10);
    staff.pinAttempts = 0;
    staff.pinLockedUntil = null;
    await staff.save();

    return res.status(200).json({ message: "PIN set successfully", hasPin: true });
  } catch (error) {
    console.error("Set Staff PIN Error:", error);
    return res.status(500).json({ message: "Failed to set PIN" });
  }
}

/**
 * Fast PIN-based session switch for shared restaurant terminals
 */
export async function switchStaffPin(req: Request, res: Response) {
  const currentTerminalUser = (req as any).user;
  const restaurantId = currentTerminalUser.restaurantId;
  const { staffId, pin } = req.body;

  try {
    const targetStaff = await StaffUserModel.findOne({ _id: staffId, restaurantId, isActive: true });
    if (!targetStaff) {
      return res.status(404).json({ message: "Staff member not found in this restaurant" });
    }

    const now = new Date();
    if (targetStaff.pinLockedUntil && new Date(targetStaff.pinLockedUntil).getTime() > now.getTime()) {
      const remainingSecs = Math.ceil((new Date(targetStaff.pinLockedUntil).getTime() - now.getTime()) / 1000);
      return res.status(423).json({
        message: `PIN access is locked due to repeated failed attempts. Try again in ${remainingSecs}s or login with password.`,
        lockedUntil: targetStaff.pinLockedUntil,
        remainingSeconds: remainingSecs,
      });
    }

    if (!targetStaff.pinHash) {
      return res.status(400).json({ message: "PIN has not been configured for this staff member" });
    }

    const isPinValid = await bcrypt.compare(pin, targetStaff.pinHash);
    if (!isPinValid) {
      const attempts = (targetStaff.pinAttempts || 0) + 1;
      targetStaff.pinAttempts = attempts;

      if (attempts >= 5) {
        targetStaff.pinLockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 min cooldown
        targetStaff.pinAttempts = 0;
        await targetStaff.save();

        return res.status(423).json({
          message: "Too many failed attempts. PIN access locked for 5 minutes.",
          lockedUntil: targetStaff.pinLockedUntil,
          attemptsRemaining: 0,
        });
      }

      await targetStaff.save();
      const attemptsRemaining = 5 - attempts;
      return res.status(401).json({
        message: `Invalid PIN. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining before lockout.`,
        attemptsRemaining,
      });
    }

    // Reset failed counter and lockout
    targetStaff.pinAttempts = 0;
    targetStaff.pinLockedUntil = null;
    await targetStaff.save();

    // Sign new access token for target staff member
    const payload = {
      id: targetStaff._id,
      restaurantId: targetStaff.restaurantId,
      role: targetStaff.role,
      name: targetStaff.name,
      assignedStation: targetStaff.assignedStation,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    return res.status(200).json({
      message: `Active staff switched to ${targetStaff.name}`,
      accessToken,
      user: {
        id: targetStaff._id,
        name: targetStaff.name,
        email: targetStaff.email,
        role: targetStaff.role,
        restaurantId: targetStaff.restaurantId,
        assignedStation: targetStaff.assignedStation,
        hasPin: true,
      },
    });
  } catch (error) {
    console.error("PIN Switch Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

