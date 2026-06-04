import { createClient } from "redis";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

let redisClient;
let hasLoggedFailure = false;
let hasAttemptedAutoStart = false;

/**
 * Attempt to auto-start Redis on Windows if it's not already running.
 * Looks for redis-server.exe in common locations.
 */
const tryAutoStartRedis = () => {
  if (hasAttemptedAutoStart) return;
  hasAttemptedAutoStart = true;

  const localAppData = process.env.LOCALAPPDATA || "";
  const possiblePaths = [
    path.join(localAppData, "Redis", "redis-server.exe"),
    "C:\\Program Files\\Redis\\redis-server.exe",
    "C:\\Redis\\redis-server.exe",
  ];

  for (const redisPath of possiblePaths) {
    if (fs.existsSync(redisPath)) {
      try {
        // Start Redis detached so it runs independently of the Node process
        exec(`start /B "" "${redisPath}" --port 6379`, { windowsHide: true }, (err) => {
          if (!err) {
            console.log("🚀 Redis: Auto-started from", redisPath);
          }
        });
        return; // Try only the first path found that exists
      } catch (e) {
        console.log("⚠️ Failed to start Redis at", redisPath, e.message);
      }
    }
  }
};

const createRedisClient = () => {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries === 1 && !hasAttemptedAutoStart && process.platform === "win32") {
          // First retry on Windows — try to auto-start Redis
          tryAutoStartRedis();
        }
        if (retries === 5 && !hasLoggedFailure) {
          console.log("⚠️ Redis: Local instance not found. Running in DB-only mode. Retrying connection in background...");
          hasLoggedFailure = true;
        }
        if (retries > 10) {
          return 30000; // Wait 30 seconds after many failures
        }
        if (retries > 5) {
          return 5000; // Wait 5 seconds after initial failures
        }
        return 1000; // Wait 1 second initially
      },
    },
  });

  client.on("connect", () => {
    console.log("✅ Redis Connected");
    hasLoggedFailure = false; // Reset so reconnection is logged properly
  });

  client.on("ready", () => {
    console.log("✅ Redis Ready — Caching enabled");
  });

  client.on("error", (err) => {
    // Suppress spamming connection errors but allow Node's internal retry mechanism
  });

  client.on("end", () => {
    console.log("⚠️ Redis disconnected");
  });

  return client;
};

redisClient = createRedisClient();

const connectRedis = async () => {
  // On Windows, try to auto-start Redis before connecting
  if (process.platform === "win32" && !hasAttemptedAutoStart) {
    tryAutoStartRedis();
    // Give Redis a moment to start up
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  try {
    await redisClient.connect();
  } catch (error) {
    if (!hasLoggedFailure) {
      console.log("⚠️ Redis: Connection failed. Running in DB-only mode. App works fine without Redis.");
      hasLoggedFailure = true;
    }
  }
};

// Export isRedisConnected as a function returning whether the client is open
const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};

export { redisClient, connectRedis, isRedisConnected };