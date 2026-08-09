import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

/**
 * Initializes Socket.IO with CORS settings and registers connection events
 */
export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow cross-origin requests for flexible dev and deployment
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket: Socket) => {
    // Join restaurant tenant room
    socket.on("join-restaurant", (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}`);
      }
    });

    // Join kitchen prep station room
    socket.on("join-station", ({ restaurantId, station }: { restaurantId: string; station: string }) => {
      if (restaurantId && station) {
        socket.join(`restaurant:${restaurantId}:station:${station}`);
      }
    });

    // Unsubscribe helper
    socket.on("leave-station", ({ restaurantId, station }: { restaurantId: string; station: string }) => {
      if (restaurantId && station) {
        socket.leave(`restaurant:${restaurantId}:station:${station}`);
      }
    });

    socket.on("disconnect", () => {
      // Automatic socket cleanup
    });
  });

  return io;
}

/**
 * Retrieves the global io Server instance
 */
export function getIO() {
  return io;
}

/**
 * Emits real-time messages to a specific restaurant tenant
 */
export function emitToRestaurant(restaurantId: string, event: string, data: any) {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit(event, data);
  }
}

/**
 * Emits real-time messages to a specific kitchen prep station in a restaurant
 */
export function emitToStation(restaurantId: string, station: string, event: string, data: any) {
  if (io) {
    io.to(`restaurant:${restaurantId}:station:${station}`).emit(event, data);
  }
}
