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

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
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
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function registerStaff(req: Request, res: Response) {
  const { name, email, password, role, assignedStation } = req.body;
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
    const newStaff = new StaffUserModel({
      restaurantId,
      name,
      email,
      passwordHash,
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

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

export function logoutStaff(req: Request, res: Response) {
  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out successfully" });
}
