import { Request, Response, NextFunction } from "express";

/**
 * Global centralized error-handling middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Internal Server Error:", err);
  const status = err.status || err.statusCode || 500;
  
  return res.status(status).json({
    message: err.message || "An unexpected error occurred",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}
