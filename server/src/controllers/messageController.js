import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Notification from "../models/Notification.js";
import cloudinary from "../config/cloudinary.js";

import { io } from "../../server.js";
import { userSocketMap } from "../socket/socket.js";
import { redisClient, isRedisConnected } from "../config/redis.js";

const sendMessage = async (req, res, next) => {
    try {
        const senderId = req.user.id;
        const { conversationId, content, image, video, replyTo, fileUrl, fileName } = req.body;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.user.toString() === senderId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Not allowed",
            });
        }

        if (!content && !image && !video && !fileUrl) {
            return res.status(400).json({
                success: false,
                message: "Message cannot be empty",
            });
        }

        let messageType = req.body.messageType || "text";
        let mediaUrl = null;
        if (image) {
            messageType = "image";
            mediaUrl = image;
        } else if (video) {
            messageType = "video";
            mediaUrl = video;
        } else if (fileUrl) {
            if (messageType !== "sticker") {
                messageType = "file";
            }
            mediaUrl = fileUrl;
        }

        let repliedMessage = null;

        if (replyTo) {
            repliedMessage = await Message.findById(replyTo);

            if (!repliedMessage) {
                return res.status(404).json({
                    success: false,
                    message: "Replied message not found",
                });
            }

            if (repliedMessage.conversation.toString() !== conversationId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid reply message",
                });
            }
        }

        const message = await Message.create({
            senderId,
            conversation: conversationId,
            content: content || "",
            mediaUrl,
            messageType,
            fileName: fileName || null,
            replyTo: replyTo || null
        });

        // Auto-deliver to online recipients & queue for offline
        let hasOnlineRecipient = false;
        for (const participant of conversation.participants) {
            const recipientId = participant.user.toString();

            if (recipientId === senderId) continue; // Skip sender

            if (userSocketMap.has(recipientId)) {
                hasOnlineRecipient = true;
            } else {
                if (isRedisConnected()) {
                    try {
                        const pendingKey = `user:${recipientId}:pending_messages`;
                        await redisClient.sAdd(pendingKey, message._id.toString());
                        await redisClient.expire(pendingKey, 604800);
                    } catch (redisError) {
                        console.log("⚠️ Redis offline queue failed:", redisError.message);
                    }
                }
            }
        }

        if (hasOnlineRecipient) {
            message.status = "delivered";
            message.deliveredAt = new Date();
            await message.save();
        }

        const populatedMessage = await Message.findById(message._id)
            .populate("senderId", "name email profilePicture")
            .populate("reactions.user", "name profilePicture")
            .populate({
                path: "replyTo",
                select: "content senderId",
                populate: {
                    path: "senderId",
                    select: "name"
                }
            });

        if (hasOnlineRecipient) {
            io.to(conversationId).emit("message_status_updated", {
                messageId: message._id,
                status: "delivered",
                deliveredAt: message.deliveredAt,
            });
        }

        for (const participant of conversation.participants) {
            const receiverId = participant.user.toString();

            if (receiverId === senderId) continue;

            try {
                const notification = await Notification.create({
                    sender: senderId,
                    receiver: receiverId,
                    type: "message",
                    message: message._id,
                    conversationId
                });

                const socketId = userSocketMap.get(receiverId);

                if (socketId) {
                    io.to(socketId).emit("new_notification", {
                        _id: notification._id,
                        sender: senderId,
                        message: populatedMessage.content,
                        conversationId,
                        type: "message",
                        createdAt: notification.createdAt
                    });
                }
            } catch (notifError) {
                console.log("⚠️ Notification creation failed:", notifError.message);
            }
        }

        // Emit message to online participants
        conversation.participants.forEach((participant) => {
            const userId = participant.user.toString();

            if (userId !== senderId) {
                const socketId = userSocketMap.get(userId);

                if (socketId) {
                    io.to(socketId).emit("receiveMessage", populatedMessage);
                }
            }
        });

        // Update lastMessage on conversation
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageAt: new Date(),
        });

        // Update Redis cache on sending message
        if (isRedisConnected()) {
            const cacheKey = `chat:${conversationId}:messages`;
            try {
                const cacheExists = await redisClient.exists(cacheKey);
                if (cacheExists) {
                    await redisClient.lPush(cacheKey, JSON.stringify(populatedMessage));
                    await redisClient.expire(cacheKey, 300);
                }
                
                // Invalidate conversations list cache for all participants
                for (const participant of conversation.participants) {
                    const pId = participant.user.toString();
                    await redisClient.del(`user:${pId}:conversations`);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache update failed (send message):", redisError.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: populatedMessage,
        });

    } catch (error) {
        next(error);
    }
};

const getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const cacheKey = `chat:${conversationId}:messages`;

        // Try cache first (page 1 only)
        if (page === 1 && isRedisConnected()) {
            try {
                const cachedMessages = await redisClient.lRange(cacheKey, 0, -1);

                if (cachedMessages.length > 0) {
                    const messages = cachedMessages
                        .map(msg => JSON.parse(msg))
                        .slice(0, limit);

                    const totalMessages = await Message.countDocuments({
                        conversation: conversationId,
                    });

                    return res.status(200).json({
                        success: true,
                        source: "cache",
                        message: "Messages fetched from cache",
                        data: messages,
                        pagination: {
                            currentPage: page,
                            totalPages: Math.ceil(totalMessages / limit),
                            totalMessages,
                        },
                    });
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache read failed, falling back to DB:", redisError.message);
            }
        }

        const messages = await Message.find({
            conversation: conversationId,
        })
            .populate("senderId", "name email profilePicture")
            .populate("reactions.user", "name profilePicture")
            .populate({
                path: "replyTo",
                select: "content senderId",
                populate: {
                    path: "senderId",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments({
            conversation: conversationId,
        });

        // Populate cache for page 1
        if (page === 1 && isRedisConnected()) {
            try {
                await redisClient.del(cacheKey);

                if (messages.length > 0) {
                    for (let msg of messages) {
                        await redisClient.rPush(cacheKey, JSON.stringify(msg));
                    }

                    await redisClient.expire(cacheKey, 300);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache write failed:", redisError.message);
            }
        }

        return res.status(200).json({
            success: true,
            source: "db",
            message: "Messages fetched successfully",
            data: messages,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit),
                totalMessages,
            },
        });

    } catch (error) {
        next(error);
    }
};

const markAsSeen = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.user.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Not allowed",
            });
        }

        const result = await Message.updateMany(
            {
                conversation: conversationId,
                senderId: { $ne: userId },
                status: { $in: ["sent", "delivered"] },
                isDeleted: false,
            },
            {
                $set: { status: "seen", seenAt: new Date() },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Messages marked as seen",
            modifiedCount: result.modifiedCount,
        });

    } catch (error) {
        next(error);
    }
};

const deleteMessage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        if (message.senderId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own messages",
            });
        }

        if (message.cloudinaryId) {
            await cloudinary.uploader.destroy(message.cloudinaryId, {
                resource_type: "auto",
            });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.mediaUrl = null;
        message.cloudinaryId = null;
        message.content = "This message was deleted";

        await message.save();

        // Update Redis cache
        if (isRedisConnected()) {
            const cacheKey = `chat:${message.conversation}:messages`;

            try {
                const cachedMessages = await redisClient.lRange(cacheKey, 0, -1);

                const updated = cachedMessages.map(msg => {
                    const parsed = JSON.parse(msg);

                    if (parsed._id === messageId) {
                        parsed.content = "This message was deleted";
                        parsed.isDeleted = true;
                        parsed.mediaUrl = null;
                    }

                    return JSON.stringify(parsed);
                });

                await redisClient.del(cacheKey);

                if (updated.length > 0) {
                    await redisClient.rPush(cacheKey, updated);
                    await redisClient.expire(cacheKey, 300);
                }

                // Invalidate conversations list cache for all participants
                const conv = await Conversation.findById(message.conversation);
                if (conv) {
                    for (const participant of conv.participants) {
                        const pId = participant.user.toString();
                        await redisClient.del(`user:${pId}:conversations`);
                    }
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache update failed (delete):", redisError.message);
            }
        }

        io.to(message.conversation.toString()).emit("message_deleted", {
            messageId: message._id,
        });

        res.status(200).json({
            success: true,
            message: "Message deleted successfully",
        });

    } catch (error) {
        next(error);
    }
};

const markAsDelivered = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.user.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Not allowed",
            });
        }

        const result = await Message.updateMany(
            {
                conversation: conversationId,
                senderId: { $ne: userId },
                status: "sent",
                isDeleted: false,
            },
            {
                $set: { status: "delivered", deliveredAt: new Date() },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Messages marked as delivered",
            modifiedCount: result.modifiedCount,
        });

    } catch (error) {
        next(error);
    }
};

const editMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        const userId = req.user.id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        if (message.senderId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to edit this message"
            });
        }

        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Cannot edit deleted message"
            });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();

        // Update Redis cache
        if (isRedisConnected()) {
            const cacheKey = `chat:${message.conversation}:messages`;

            try {
                const cachedMessages = await redisClient.lRange(cacheKey, 0, -1);

                const updated = cachedMessages.map(msg => {
                    const parsed = JSON.parse(msg);

                    if (parsed._id === messageId) {
                        parsed.content = content;
                        parsed.isEdited = true;
                        parsed.editedAt = message.editedAt;
                    }

                    return JSON.stringify(parsed);
                });

                await redisClient.del(cacheKey);

                if (updated.length > 0) {
                    await redisClient.rPush(cacheKey, updated);
                    await redisClient.expire(cacheKey, 300);
                }

                // Invalidate conversations list cache for all participants
                const conv = await Conversation.findById(message.conversation);
                if (conv) {
                    for (const participant of conv.participants) {
                        const pId = participant.user.toString();
                        await redisClient.del(`user:${pId}:conversations`);
                    }
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache update failed (edit):", redisError.message);
            }
        }

        io.to(message.conversation.toString()).emit("message_edited", {
            messageId: message._id,
            content: message.content,
            isEdited: true,
            editedAt: message.editedAt
        });

        res.status(200).json({
            success: true,
            message: "Message edited successfully",
            data: message
        });

    } catch (error) {
        next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        const count = await Message.countDocuments({
            conversation: conversationId,
            senderId: { $ne: userId },
            status: { $in: ["sent", "delivered"] },
            isDeleted: false,
        });

        return res.status(200).json({
            success: true,
            unreadCount: count,
        });

    } catch (error) {
        next(error);
    }
};

const searchMessages = async (req, res, next) => {
    try {
        const { query, conversationId, page = 1, limit = 20 } = req.query;

        const skip = (page - 1) * limit;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: "Conversation ID is required"
            });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.user.toString() === req.user.id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const messages = await Message.find({
            conversation: conversationId,
            isDeleted: false,
            $text: { $search: query }
        })
            .populate("senderId", "name email profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            results: messages.length,
            data: messages
        });

    } catch (error) {
        next(error);
    }
};

const reactToMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji) {
            return res.status(400).json({
                success: false,
                message: "Emoji is required"
            });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Cannot react to deleted message"
            });
        }

        const existingReaction = message.reactions.find(
            (r) => r.user.toString() === userId
        );

        if (existingReaction) {
            existingReaction.emoji = emoji;
        } else {
            message.reactions.push({
                user: userId,
                emoji
            });
        }

        await message.save();
        await message.populate("reactions.user", "name profilePicture");

        // Update Redis cache on message reaction
        if (isRedisConnected()) {
            const cacheKey = `chat:${message.conversation}:messages`;
            try {
                const cachedMessages = await redisClient.lRange(cacheKey, 0, -1);
                const updated = cachedMessages.map(msg => {
                    const parsed = JSON.parse(msg);
                    if (parsed._id === messageId) {
                        parsed.reactions = message.reactions;
                    }
                    return JSON.stringify(parsed);
                });

                await redisClient.del(cacheKey);
                if (updated.length > 0) {
                    await redisClient.rPush(cacheKey, updated);
                    await redisClient.expire(cacheKey, 300);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache update failed (react):", redisError.message);
            }
        }

        // Emit reaction to online participants
        const conversation = await Conversation.findById(message.conversation);
        if (conversation) {
            conversation.participants.forEach((participant) => {
                const pId = participant.user.toString();
                if (pId !== userId) {
                    const socketId = userSocketMap.get(pId);
                    if (socketId) {
                        io.to(socketId).emit("message_reacted", {
                            messageId: message._id,
                            reactions: message.reactions
                        });
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "Reaction updated",
            data: message.reactions
        });

    } catch (error) {
        next(error);
    }
};

const removeReaction = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        message.reactions = message.reactions.filter(
            (r) => r.user.toString() !== userId
        );

        await message.save();
        await message.populate("reactions.user", "name profilePicture");

        // Update Redis cache on message reaction removal
        if (isRedisConnected()) {
            const cacheKey = `chat:${message.conversation}:messages`;
            try {
                const cachedMessages = await redisClient.lRange(cacheKey, 0, -1);
                const updated = cachedMessages.map(msg => {
                    const parsed = JSON.parse(msg);
                    if (parsed._id === messageId) {
                        parsed.reactions = message.reactions;
                    }
                    return JSON.stringify(parsed);
                });

                await redisClient.del(cacheKey);
                if (updated.length > 0) {
                    await redisClient.rPush(cacheKey, updated);
                    await redisClient.expire(cacheKey, 300);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache update failed (remove react):", redisError.message);
            }
        }

        // Emit reaction removal to online participants
        const conversation = await Conversation.findById(message.conversation);
        if (conversation) {
            conversation.participants.forEach((participant) => {
                const pId = participant.user.toString();
                if (pId !== userId) {
                    const socketId = userSocketMap.get(pId);
                    if (socketId) {
                        io.to(socketId).emit("message_reacted", {
                            messageId: message._id,
                            reactions: message.reactions
                        });
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "Reaction removed",
            data: message.reactions
        });

    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        if (notification.receiver.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to mark this notification"
            });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });

    } catch (error) {
        next(error);
    }
};

const forwardMessage = async (req, res, next) => {
    try {
        const senderId = req.user.id;
        const { messageId, conversationId } = req.body;

        if (!messageId || !conversationId) {
            return res.status(400).json({
                success: false,
                message: "messageId and conversationId are required"
            });
        }

        const originalMessage = await Message.findById(messageId);
        if (!originalMessage) {
            return res.status(404).json({
                success: false,
                message: "Original message not found"
            });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Target conversation not found"
            });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.user.toString() === senderId
        );
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const forwardedMsg = await Message.create({
            senderId,
            conversation: conversationId,
            content: originalMessage.content || "",
            mediaUrl: originalMessage.mediaUrl,
            messageType: originalMessage.messageType,
            fileName: originalMessage.fileName || null,
            isForwarded: true,
            forwardedFrom: originalMessage.conversation,
        });

        // Auto-deliver to online recipients & queue for offline
        let hasOnlineRecipient = false;
        for (const participant of conversation.participants) {
            const recipientId = participant.user.toString();

            if (recipientId === senderId) continue; // Skip sender

            if (userSocketMap.has(recipientId)) {
                hasOnlineRecipient = true;
            } else {
                if (isRedisConnected()) {
                    try {
                        const pendingKey = `user:${recipientId}:pending_messages`;
                        await redisClient.sAdd(pendingKey, forwardedMsg._id.toString());
                        await redisClient.expire(pendingKey, 604800);
                    } catch (redisError) {
                        console.log("⚠️ Redis offline queue failed:", redisError.message);
                    }
                }
            }
        }

        if (hasOnlineRecipient) {
            forwardedMsg.status = "delivered";
            forwardedMsg.deliveredAt = new Date();
            await forwardedMsg.save();
        }

        const populatedMessage = await Message.findById(forwardedMsg._id)
            .populate("senderId", "name email profilePicture");

        if (hasOnlineRecipient) {
            io.to(conversationId).emit("message_status_updated", {
                messageId: forwardedMsg._id,
                status: "delivered",
                deliveredAt: forwardedMsg.deliveredAt,
            });
        }

        // Emit to online participants
        conversation.participants.forEach((participant) => {
            const userId = participant.user.toString();
            if (userId !== senderId) {
                const socketId = userSocketMap.get(userId);
                if (socketId) {
                    io.to(socketId).emit("receiveMessage", populatedMessage);
                }
            }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: forwardedMsg._id,
            lastMessageAt: new Date(),
        });

        return res.status(201).json({
            success: true,
            message: "Message forwarded successfully",
            data: populatedMessage,
        });

    } catch (error) {
        next(error);
    }
};

export { sendMessage, getMessages, markAsSeen, deleteMessage, markAsDelivered, editMessage, getUnreadCount, searchMessages, reactToMessage, removeReaction, markAsRead, forwardMessage };