import express from "express";
import { sendMessage, getMessages, markAsSeen, deleteMessage, markAsDelivered, editMessage, getUnreadCount, searchMessages, reactToMessage, removeReaction, markAsRead, forwardMessage } from "../controllers/messageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, sendMessage);    // Create message
router.post("/forward", authMiddleware, forwardMessage);   // Forward message
router.get("/search", authMiddleware, searchMessages);     // search messages
router.get("/unread/:conversationId", authMiddleware, getUnreadCount);   // Get unread message count
router.get("/:conversationId", authMiddleware, getMessages);   // Get messages for a conversation
router.put("/seen/:conversationId", authMiddleware, markAsSeen);  // Mark messages as seen
router.delete("/:messageId", authMiddleware, deleteMessage);   // Delete message
router.put("/delivered/:conversationId", authMiddleware, markAsDelivered);  // Mark messages as delivered
router.put("/edit/:messageId", authMiddleware, editMessage);  // Edit message
router.put("/react/:messageId", authMiddleware, reactToMessage);  // React to message
router.delete("/react/:messageId", authMiddleware, removeReaction);  // Remove reaction from message
router.put("/read/:id", authMiddleware, markAsRead);  // Mark messages as read

export default router;