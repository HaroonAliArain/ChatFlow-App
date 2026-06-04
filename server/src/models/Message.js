import mongoose, { Schema, model } from "mongoose";

const messageSchema = new Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    content: {
        type: String,
        default: "",
    },
    mediaUrl: {
        type: String,
        default: null,
    },
    fileName: {
        type: String,
        default: null,
    },
    cloudinaryId: {
        type: String,
        default: null,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "video", "file", "sticker"],
        default: "text",
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent",
    },
    deliveredAt: {
        type: Date,
        default: null,
    },
    seenAt: {
        type: Date,
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        emoji: {
            type: String
        }
    }],
    isForwarded: {
        type: Boolean,
        default: false
    },
    forwardedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        default: null
    }

}, { timestamps: true });

// Index for fast delivery status and unread count queries
messageSchema.index({ conversation: 1, status: 1, senderId: 1 });
messageSchema.index({ content: "text" });

export default model("Message", messageSchema);