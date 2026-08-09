import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { initSocket } from "./socket";
import router from "./routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Connect to MongoDB
connectDB();

// CORS Settings
const allowedOrigins = [
  process.env.CLIENT_ADMIN_URL || "http://localhost:5173",
  process.env.CLIENT_CUSTOMER_URL || "http://localhost:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in dev, can restrict in production
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" })); // Increased limit for base64 images if uploaded
app.use(cookieParser());

// Mount central router
app.use("/api/v1", router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };
