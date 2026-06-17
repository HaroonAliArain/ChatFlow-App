import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import { redisClient, isRedisConnected } from "../config/redis.js";

export const userSocketMap = new Map();

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:5173",
                "https://chatflow-app-frontend.onrender.com",
            ],
            credentials: true,
        },
    });

    // SOCKET AUTH
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error("Authentication error: Token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            socket.user = decoded;

            next();
        } catch (error) {
            console.log("❌ Auth error:", error.message);
            return next(new Error("Authentication error"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user.id;

        // 🟢 ONLINE STATUS
        userSocketMap.set(userId, socket.id);

        // Broadcast online users list to ALL connected clients
        const onlineUserIds = [...userSocketMap.keys()];
        io.emit("getOnlineUsers", onlineUserIds);

        User.findByIdAndUpdate(userId, { isOnline: true }).catch(console.log);

        // 📬 DELIVER PENDING MESSAGES (offline queue)
        if (isRedisConnected()) {
            try {
                const pendingKey = `user:${userId}:pending_messages`;
                const pendingIds = await redisClient.sMembers(pendingKey);

                if (pendingIds.length > 0) {
                    const pendingMessages = await Message.find({
                        _id: { $in: pendingIds },
                        isDeleted: false,
                    })
                        .populate("senderId", "name email profilePicture")
                        .sort({ createdAt: 1 });

                    if (pendingMessages.length > 0) {
                        socket.emit("pending_messages", pendingMessages);

                        // Mark all pending messages as delivered
                        const messageIds = pendingMessages.map(m => m._id);

                        await Message.updateMany(
                            { _id: { $in: messageIds }, status: "sent" },
                            { status: "delivered", deliveredAt: new Date() }
                        );

                        // Notify senders about delivery status
                        pendingMessages.forEach((msg) => {
                            const senderSocketId = userSocketMap.get(msg.senderId._id.toString());

                            if (senderSocketId) {
                                io.to(senderSocketId).emit("message_status_updated", {
                                    messageId: msg._id,
                                    status: "delivered",
                                    deliveredAt: new Date(),
                                });
                            }
                        });

                    }

                    // Clear the pending queue
                    await redisClient.del(pendingKey);
                }
            } catch (error) {
                console.log("⚠️ Pending message delivery failed:", error.message);
            }
        }

        // JOIN CHAT ROOM
        socket.on("join_chat", (conversationId) => {
            socket.join(conversationId);
        });

        // LEAVE CHAT ROOM
        socket.on("leave_chat", (conversationId) => {
            socket.leave(conversationId);
        });

        // MESSAGE PAGINATION
        socket.on("fetch_messages", async (data, callback) => {
            try {
                const { conversationId, page = 1, limit = 20 } = data;

                const skip = (page - 1) * limit;

                const messages = await Message.find({ conversation: conversationId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit);

                const sortedMessages = messages.reverse();

                callback({
                    success: true,
                    messages: sortedMessages,
                    page,
                    hasMore: messages.length === limit,
                });

            } catch (error) {
                console.log("❌ fetch_messages error:", error);
                callback({
                    success: false,
                    message: "Failed to fetch messages",
                });
            }
        });

        // 🔄 RECONNECT SYNC — Fetch missed messages since last sync
        socket.on("reconnect_sync", async (data) => {
            try {
                const { lastSyncTime } = data;

                // Only fetch messages from conversations this user belongs to
                const userConversations = await Conversation.find({
                    "participants.user": userId,
                }).select("_id");

                const conversationIds = userConversations.map(c => c._id);

                const missedMessages = await Message.find({
                    conversation: { $in: conversationIds },
                    createdAt: { $gt: new Date(lastSyncTime) },
                    isDeleted: false,
                })
                    .populate("senderId", "name email profilePicture")
                    .sort({ createdAt: 1 });

                socket.emit("sync_messages", {
                    messages: missedMessages,
                });

            } catch (error) {
                console.error("❌ Reconnect sync error:", error);
            }
        });

        // ✉️ SEND MESSAGE (with ACK)
        socket.on("send_message", async (data, callback) => {
            try {
                const message = await Message.create({
                    conversation: data.conversationId,
                    senderId: socket.user.id,
                    content: data.text || "",
                    mediaUrl: data.mediaUrl || null,
                    cloudinaryId: data.cloudinaryId || null,
                    messageType: data.messageType || "text",
                });

                // Emit to room
                io.to(data.conversationId).emit("receive_message", message);

                // ACK back to sender — confirms server received & saved the message
                if (typeof callback === "function") {
                    callback({ success: true, message });
                }

                // Update lastMessage on conversation
                Conversation.findByIdAndUpdate(data.conversationId, {
                    lastMessage: message._id,
                    lastMessageAt: new Date(),
                }).catch(err => console.log("⚠️ lastMessage update failed:", err.message));

                // Auto-deliver to online recipients & queue for offline
                try {
                    const conversation = await Conversation.findById(data.conversationId);

                    let hasOnlineRecipient = false;

                    for (const participant of conversation.participants) {
                        const recipientId = participant.user.toString();

                        if (recipientId === socket.user.id) continue; // Skip sender

                        if (userSocketMap.has(recipientId)) {
                            // Recipient is online → auto-deliver
                            hasOnlineRecipient = true;
                        } else {
                            // Recipient is offline → queue in Redis
                            if (isRedisConnected()) {
                                try {
                                    const pendingKey = `user:${recipientId}:pending_messages`;
                                    await redisClient.sAdd(pendingKey, message._id.toString());
                                    // Expire after 7 days to prevent stale data
                                    await redisClient.expire(pendingKey, 604800);
                                } catch (redisError) {
                                    console.log("⚠️ Redis offline queue failed:", redisError.message);
                                }
                            }
                        }
                    }

                    // If any recipient is online, mark as delivered
                    if (hasOnlineRecipient) {
                        await Message.findByIdAndUpdate(message._id, {
                            status: "delivered",
                            deliveredAt: new Date(),
                        });

                        io.to(data.conversationId).emit("message_status_updated", {
                            messageId: message._id,
                            status: "delivered",
                            deliveredAt: new Date(),
                        });
                    }
                } catch (deliveryError) {
                    console.log("⚠️ Auto-delivery logic failed:", deliveryError.message);
                }

                // Update Redis message cache
                if (isRedisConnected()) {
                    try {
                        const cacheKey = `chat:${data.conversationId}:messages`;

                        await redisClient.lPush(cacheKey, JSON.stringify(message));
                        await redisClient.lTrim(cacheKey, 0, 49);
                        await redisClient.expire(cacheKey, 300);
                    } catch (redisError) {
                        console.log("⚠️ Redis cache update failed (send):", redisError.message);
                    }
                }

            } catch (error) {
                console.log("❌ send_message error:", error);

                if (typeof callback === "function") {
                    callback({ success: false, error: "Failed to send message" });
                }
            }
        });

        // ✅ MESSAGE DELIVERED
        socket.on("message_delivered", async ({ messageId, conversationId }) => {
            try {
                const updated = await Message.findByIdAndUpdate(
                    messageId,
                    {
                        status: "delivered",
                        deliveredAt: new Date(),
                    },
                    { new: true }
                );

                if (updated) {
                    io.to(conversationId).emit("message_status_updated", {
                        messageId: updated._id,
                        status: "delivered",
                        deliveredAt: updated.deliveredAt,
                    });
                }

            } catch (error) {
                console.log("❌ delivered error:", error);
            }
        });

        // 👁️ MESSAGE SEEN
        socket.on("message_seen", async ({ conversationId }) => {
            try {
                const result = await Message.updateMany(
                    {
                        conversation: conversationId,
                        senderId: { $ne: userId },
                        status: { $in: ["sent", "delivered"] },
                    },
                    {
                        status: "seen",
                        seenAt: new Date(),
                    }
                );

                if (result.modifiedCount > 0) {
                    io.to(conversationId).emit("messages_seen", {
                        conversationId,
                        userId,
                        seenAt: new Date(),
                    });

                    // Invalidate Redis caches
                    if (isRedisConnected()) {
                        try {
                            const conversation = await Conversation.findById(conversationId);
                            if (conversation) {
                                for (const participant of conversation.participants) {
                                    const pId = participant.user.toString();
                                    await redisClient.del(`user:${pId}:conversations`);
                                }
                            }
                            await redisClient.del(`chat:${conversationId}:messages`);
                        } catch (redisError) {
                            console.log("⚠️ Redis cache invalidation failed (message_seen socket):", redisError.message);
                        }
                    }
                }

            } catch (error) {
                console.log("❌ seen error:", error);
            }
        });

        // 🗑️ DELETE MESSAGE
        socket.on("delete_message", async (data) => {
            try {
                const { messageId } = data;
            } catch (error) {
                console.log("Delete socket error:", error);
            }
        });

        // ⌨️ TYPING SYSTEM
        socket.on("typing_start", async (conversationId) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                conversation.participants.forEach((participant) => {
                    const recipientId = participant.user.toString();
                    if (recipientId === socket.user.id) return; // Skip sender

                    const recipientSocketId = userSocketMap.get(recipientId);
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("typing", {
                            conversationId,
                            isTyping: true,
                            userId: socket.user.id,
                            userName: socket.user.name,
                        });
                    }
                });
            } catch (err) {
                console.log("⚠️ typing_start error:", err.message);
            }
        });

        socket.on("typing_stop", async (conversationId) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                conversation.participants.forEach((participant) => {
                    const recipientId = participant.user.toString();
                    if (recipientId === socket.user.id) return; // Skip sender

                    const recipientSocketId = userSocketMap.get(recipientId);
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("typing", {
                            conversationId,
                            isTyping: false,
                        });
                    }
                });
            } catch (err) {
                console.log("⚠️ typing_stop error:", err.message);
            }
        });

        // 🔴 DISCONNECT (LAST SEEN)
        socket.on("disconnect", async () => {
            userSocketMap.delete(userId);

            // Broadcast updated online users list to ALL connected clients
            const onlineUserIds = [...userSocketMap.keys()];
            io.emit("getOnlineUsers", onlineUserIds);

            try {
                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date(),
                });
            } catch (error) {
                console.log("❌ disconnect update error:", error);
            }
        });
    });

    return io;
};