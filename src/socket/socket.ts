import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const userSocketMap = new Map<string, string>();

let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  console.log("🚀 Socket server initialized");

  io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);

    const token = socket.handshake.auth?.token;
    console.log("🔥 Token received:", token);

    if (!token) {
      console.log("❌ No token, disconnecting socket");
      socket.disconnect();
      return;
    }

    try {
      const payload = jwt.verify(token, "bunny") as any;
      const userId = String(payload.id);

      userSocketMap.set(userId, socket.id);

      console.log(`👤 User ${userId} mapped to socket ${socket.id}`);
      console.log("🟢 ONLINE USERS:", userSocketMap);

      socket.on("disconnect", () => {
        userSocketMap.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
      });
    } catch (err) {
      console.log("❌ Invalid JWT, disconnecting socket");
      socket.disconnect();
    }
  });
}

export function isUserOnline(userId: string): boolean {
  return userSocketMap.has(String(userId));
}

export function notifyUser(userId: string, payload: any) {
  const socketId = userSocketMap.get(String(userId));

  if (!socketId) {
    console.log(`📴 User ${userId} offline, notification skipped`);
    return;
  }

  io.to(socketId).emit("top_priority_notification", payload);
  console.log(`🔔 Notification sent to user ${userId}`);
}
