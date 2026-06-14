// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import connectDB from "./src/config/db.js";  // MongoDB connection
import { initializeSocket } from "./src/socket/socket.js";   // Socket.IO initialization
import { connectRedis } from "./src/config/redis.js";    // Redis connection

// Routes
import userRoutes from "./src/routes/userRoutes.js";
import conversationRoutes from "./src/routes/conversationRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import mediaRoutes from "./src/routes/mediaRoutes.js";

import errorMiddleware from "./src/middlewares/errorMiddleware.js";


dotenv.config();   // Load environment variables
const app = express();

const server = http.createServer(app);     // Create HTTP server
export const io = initializeSocket(server);       // Initialize Socket.IO with the HTTP server

app.use(express.json());   // Middleware
app.use(express.static("public"));
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://chatflow-app-dtbl.onrender.com",
        ],
        credentials: true,
    })
);

app.get("/", (req, res) => {
    res.send("Chat App Backend is Running...")   // Test route
});

app.use("/api/users", userRoutes);   // User routes
app.use("/api/conversations", conversationRoutes);   // Conversation routes
app.use("/api/messages", messageRoutes);   // Message routes
app.use("/api/media", mediaRoutes);   // Media routes


app.use(errorMiddleware);   // Error handling middleware

connectDB(); // Connect to MongoDB
connectRedis();  // Connect to Redis

const PORT = process.env.PORT || 3000;   // Port configuration

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)   // Start the server
});