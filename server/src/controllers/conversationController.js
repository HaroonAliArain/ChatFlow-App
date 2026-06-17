import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { redisClient, isRedisConnected } from "../config/redis.js";

const privateChat = async (req, res, next) => {
    try {
        const { receiverId } = req.body;
        const currentUserId = req.user.id;

        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID is required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid receiver Id'
            });
        }

        if (currentUserId === receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create a private chat with yourself.'
            });
        }

        const existingConversation = await Conversation.findOne({
            isGroup: false,
            "participants.user": { $all: [currentUserId, receiverId] },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        }).populate("participants.user", "name email profilePicture");

        if (existingConversation) {
            return res.status(200).json({
                success: true,
                message: 'Conversation already exists',
                conversation: existingConversation
            });
        }

        const newConversation = new Conversation({
            isGroup: false,
            participants: [
                { user: currentUserId, role: "member" },
                { user: receiverId, role: "member" }
            ]
        });

        const savedConversation = await newConversation.save();
        const populatedConversation = await Conversation.findById(savedConversation._id)
            .populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for both participants
        if (isRedisConnected()) {
            try {
                await redisClient.del(`user:${currentUserId}:conversations`);
                await redisClient.del(`user:${receiverId}:conversations`);
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (privateChat):", redisError.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Private conversation created successfully',
            conversation: populatedConversation
        });

    } catch (error) {
        next(error);
    }
}

const groupChat = async (req, res, next) => {
    try {
        const { groupName, participants, groupImage, groupDescription } = req.body;
        const creatorId = req.user.id;

        if (!groupName) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({
                success: false,
                message: "Participants must be a valid array"
            });
        }

        const filteredParticipants = participants.filter(
            id => id.toString() !== creatorId.toString()
        );

        const uniqueParticipants = [
            ...new Set(filteredParticipants.map(id => id.toString()))
        ];

        const participantsData = uniqueParticipants.map(userId => ({
            user: new mongoose.Types.ObjectId(userId),
            role: "member"
        }));

        participantsData.push({
            user: new mongoose.Types.ObjectId(creatorId), 
            role: "admin" 
        });

        if (participantsData.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Group must contain at least 3 users including admin"
            });
        }

        // Convert all user IDs to ObjectIds for the existing group check
        const allUserObjectIds = participantsData.map(p => p.user);

        const conversation = new Conversation({
            participants: participantsData,
            isGroup: true,
            groupName,
            groupImage,
            groupDescription
        });

        const savedConversation = await conversation.save();

        // Populate participants for the response
        const populatedConversation = await Conversation.findById(savedConversation._id)
            .populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for all group participants
        if (isRedisConnected()) {
            try {
                for (const p of participantsData) {
                    await redisClient.del(`user:${p.user}:conversations`);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (groupChat):", redisError.message);
            }
        }

        res.status(201).json({
            success: true,
            message: "Group chat created successfully",
            conversation: populatedConversation
        });

    } catch (error) {
        console.log("❌ Group chat creation error:", error.message);
        console.log("❌ Stack:", error.stack);
        if (typeof next === 'function') {
            next(error);
        } else {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error"
            });
        }
    }
};

const getUserConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = `user:${userId}:conversations`;

        if (isRedisConnected()) {
            try {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    return res.status(200).json({
                        success: true,
                        source: "cache",
                        message: "Conversations retrieved from cache",
                        ...JSON.parse(cached)
                    });
                }
            } catch (err) {
                console.log("⚠️ Redis conversation cache read failed:", err.message);
            }
        }

        const conversations = await Conversation.find({
            "participants.user": userId
        })
        .populate("participants.user", "name profilePicture isOnline lastSeen")
        .populate("lastMessage", "senderId content messageType mediaUrl isForwarded createdAt isDeleted")
        .sort({ lastMessageAt: -1 });

        // Add per-user isMuted/isPinned flags and dynamic unread count to each conversation
        const enriched = await Promise.all(conversations.map(async (conv) => {
            const convObj = conv.toObject();
            const myParticipant = convObj.participants.find(
                p => {
                    const pUser = p.user?._id || p.user;
                    return pUser && pUser.toString() === userId;
                }
            );
            convObj.isMuted = myParticipant?.isMuted || false;
            convObj.isPinned = myParticipant?.isPinned || false;

            // Calculate unread count dynamically
            const unreadCount = await Message.countDocuments({
                conversation: conv._id,
                senderId: { $ne: userId },
                status: { $ne: "seen" }
            });
            convObj.unreadCount = unreadCount;

            return convObj;
        }));

        // Sort: pinned first, then by lastMessageAt
        enriched.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
        });

        const responseData = {
            count: enriched.length,
            conversations: enriched
        };

        if (isRedisConnected()) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(responseData), {
                    EX: 300 // expire in 5 minutes
                });
            } catch (err) {
                console.log("⚠️ Redis conversation cache write failed:", err.message);
            }
        }

        res.status(200).json({
            success: true,
            source: "db",
            ...responseData
        });
    } catch (error) {
        next(error);
    }
}

const addGroupMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newMemberId } = req.body;

        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({
                success: false,
                message: "Members can only be added to group chats"
            });
        }

        const isAdmin = conversation.participants.some(
            participant => participant.user.toString() === req.user.id.toString() && participant.role === "admin"
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can add new members"
            });
        }

        const isAlreadyMember = conversation.participants.some(
            participant => participant.user.toString() === newMemberId.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({
                success: false,
                message: "User is already a member of the group"
            });
        }   

        const userExists = await User.findById(newMemberId);
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: "User to be added not found"
            });
        }

        conversation.participants.push({ user: newMemberId, role: "member" });
        await conversation.save();
        await conversation.populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for all participants (including the new one)
        if (isRedisConnected()) {
            try {
                for (const p of conversation.participants) {
                    await redisClient.del(`user:${p.user}:conversations`);
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (addGroupMember):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "New member added to the group successfully",
            conversation: conversation
        });

    } catch (error) {
        next(error);
    }
}

const removeGroupMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { memberId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({
                success: false,
                message: "Cannot remove member from a private chat"
            });
        }

        const isAdmin = conversation.participants.some(
            participant => participant.user.toString() === req.user.id.toString() && participant.role === "admin"
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can remove members"
            });
        }

        const member = conversation.participants.find(
            participant => participant.user.toString() === memberId.toString()
        );

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "User to be removed is not a member of the group"
            });
        }

        if (member.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Cannot remove another admin from the group"
            });
        }

        if (memberId === req.user.id.toString()) {
            const adminCount = conversation.participants.filter(p => p.role === "admin").length;
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot remove yourself as the only admin"
                });
            }
        }

        const updatedConversation = await Conversation.findByIdAndUpdate(
            id,
            { $pull: { participants: { user: memberId } } },
            { new: true }
        ).populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for removed member and remaining participants
        if (isRedisConnected()) {
            try {
                await redisClient.del(`user:${memberId}:conversations`);
                if (updatedConversation && updatedConversation.participants) {
                    for (const p of updatedConversation.participants) {
                        await redisClient.del(`user:${p.user._id || p.user}:conversations`);
                    }
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (removeGroupMember):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Member removed from the group successfully",
            conversation: updatedConversation
        });

    } catch (error) {
        next(error);
    }
};

const updateGroupInfo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { groupName, groupImage, groupDescription } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        if (!groupName && !groupImage && !groupDescription) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update"
            });
        }

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({
                success: false,
                message: "Cannot update a private chat"
            });
        }

        const isAdmin = conversation.participants.some(
            participant =>
                participant.user.toString() === req.user.id.toString() &&
                participant.role === "admin"
        );

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can update group info"
            });
        }

        const updateFields = {};

        if (groupName) updateFields.groupName = groupName;
        if (groupImage) updateFields.groupImage = groupImage;
        if (groupDescription) updateFields.groupDescription = groupDescription;

        const updatedConversation = await Conversation.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for all group participants
        if (isRedisConnected()) {
            try {
                if (updatedConversation && updatedConversation.participants) {
                    for (const p of updatedConversation.participants) {
                        await redisClient.del(`user:${p.user._id || p.user}:conversations`);
                    }
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (updateGroupInfo):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Group information updated successfully",
            conversation: updatedConversation
        });

    } catch (error) {
        next(error);
    }
};

const deleteConversation = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID"
            });
        }

        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const isParticipant = conversation.participants.some(
            participant =>
                participant.user.toString() === req.user.id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not a participant of this conversation"
            });
        }

        if (conversation.isGroup) {
            const isAdmin = conversation.participants.some(
                participant =>
                    participant.user.toString() === req.user.id.toString() &&
                    participant.role === "admin"
            );

            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: "Only group admins can delete this conversation"
                });
            }
        }

        await Message.deleteMany({ conversation: id });
        await Conversation.findByIdAndDelete(id);

        // Invalidate conversations cache for all participants
        if (isRedisConnected()) {
            try {
                if (conversation && conversation.participants) {
                    for (const p of conversation.participants) {
                        await redisClient.del(`user:${p.user._id || p.user}:conversations`);
                    }
                }
                // Also clean up message thread cache
                await redisClient.del(`chat:${id}:messages`);
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (deleteConversation):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Conversation deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

const toggleMute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const participant = conversation.participants.find(
            p => p.user.toString() === userId
        );
        if (!participant) {
            return res.status(403).json({ success: false, message: "Not a participant" });
        }

        participant.isMuted = !participant.isMuted;
        await conversation.save();

        // Invalidate conversations cache for the toggling user
        if (isRedisConnected()) {
            try {
                await redisClient.del(`user:${userId}:conversations`);
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (toggleMute):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: participant.isMuted ? "Chat muted" : "Chat unmuted",
            isMuted: participant.isMuted
        });
    } catch (error) {
        next(error);
    }
};

const togglePin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const participant = conversation.participants.find(
            p => p.user.toString() === userId
        );
        if (!participant) {
            return res.status(403).json({ success: false, message: "Not a participant" });
        }

        participant.isPinned = !participant.isPinned;
        await conversation.save();

        // Invalidate conversations cache for the toggling user
        if (isRedisConnected()) {
            try {
                await redisClient.del(`user:${userId}:conversations`);
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (togglePin):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: participant.isPinned ? "Chat pinned" : "Chat unpinned",
            isPinned: participant.isPinned
        });
    } catch (error) {
        next(error);
    }
};

const leaveGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID"
            });
        }

        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({
                success: false,
                message: "Cannot leave a private chat"
            });
        }

        const isParticipant = conversation.participants.some(
            p => p.user.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        // Remove user from participants
        const userParticipant = conversation.participants.find(p => p.user.toString() === userId);
        const wasAdmin = userParticipant.role === "admin";

        conversation.participants = conversation.participants.filter(
            p => p.user.toString() !== userId
        );

        // If no participants left, delete conversation entirely
        if (conversation.participants.length === 0) {
            await Message.deleteMany({ conversation: id });
            await Conversation.findByIdAndDelete(id);

            // Invalidate conversations cache for the leaving user
            if (isRedisConnected()) {
                try {
                    await redisClient.del(`user:${userId}:conversations`);
                    await redisClient.del(`chat:${id}:messages`);
                } catch (redisError) {
                    console.log("⚠️ Redis cache invalidation failed (leaveGroup empty):", redisError.message);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Left group. Group was deleted because it had no members left."
            });
        }

        // If the leaving user was the only admin, assign admin to the next member
        if (wasAdmin) {
            const hasOtherAdmin = conversation.participants.some(p => p.role === "admin");
            if (!hasOtherAdmin) {
                // Assign first available member as admin
                conversation.participants[0].role = "admin";
            }
        }

        await conversation.save();
        await conversation.populate("participants.user", "name email profilePicture");

        // Invalidate conversations cache for leaving user and remaining members
        if (isRedisConnected()) {
            try {
                await redisClient.del(`user:${userId}:conversations`);
                if (conversation && conversation.participants) {
                    for (const p of conversation.participants) {
                        await redisClient.del(`user:${p.user._id || p.user}:conversations`);
                    }
                }
            } catch (redisError) {
                console.log("⚠️ Redis cache invalidation failed (leaveGroup):", redisError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Successfully left the group",
            conversation
        });

    } catch (error) {
        next(error);
    }
};

export { privateChat, groupChat, getUserConversations, addGroupMember, removeGroupMember, updateGroupInfo, deleteConversation, toggleMute, togglePin, leaveGroup };