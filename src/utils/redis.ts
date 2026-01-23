import { Redis } from "ioredis";
if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
    throw new Error("Missing Redis environment variables.");
}
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});
redisConnection.on("connect", () => {
    console.log("✅ Connected to Redis");
});

redisConnection.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
});