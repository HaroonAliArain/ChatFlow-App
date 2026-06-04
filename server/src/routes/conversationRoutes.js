import express from "express";
import { privateChat, groupChat, getUserConversations, addGroupMember, removeGroupMember, updateGroupInfo, deleteConversation, toggleMute, togglePin, leaveGroup } from "../controllers/conversationController.js"; 
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/private", authMiddleware, privateChat);        // Route for creating a private conversation, protected by authentication middleware
router.post("/group", authMiddleware, groupChat);            // Route for creating a group conversation, protected by authentication middleware
router.get("/", authMiddleware, getUserConversations);       // Route to get all conversations of the authenticated user, protected by authentication middleware
router.put("/:id/add-member", authMiddleware, addGroupMember);    // Route to add a member to a group conversation, protected by authentication middleware
router.put("/:id/remove-member", authMiddleware, removeGroupMember);   // Route to remove a member from a group conversation, protected by authentication middleware
router.put("/:id/update-group", authMiddleware, updateGroupInfo);      // Route to update group conversation information (name, description), protected by authentication middleware
router.put("/:id/mute", authMiddleware, toggleMute);               // Toggle mute notifications for a conversation
router.put("/:id/pin", authMiddleware, togglePin);                 // Toggle pin a conversation
router.put("/:id/leave", authMiddleware, leaveGroup);               // Route to leave a group conversation
router.delete("/:id/delete", authMiddleware, deleteConversation);      // Route to delete a conversation, protected by authentication middleware
 
export default router;