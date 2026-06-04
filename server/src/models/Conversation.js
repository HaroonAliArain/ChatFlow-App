import mongoose, { Schema, model } from 'mongoose';

const conversationSchema = new Schema({
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member',
        },
        isMuted: {
            type: Boolean,
            default: false,
        },
        isPinned: {
            type: Boolean,
            default: false,
        }
    }],
    isGroup: {
        type: Boolean,
        default: false,
    },
    groupName: {
        type: String,
        required: function () {
            return this.isGroup;
        }
    },
    groupImage: {
        type: String,
        default: '/avatars/defaultGroupImage.png',
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
    },
    groupDescription: {
        type: String,
        default: 'Group for discussions, updates, and general conversations.',
        trim: true,
    }
}, { timestamps: true });


conversationSchema.index({ 
    "participants.user": 1,
    createdAt: -1
});

conversationSchema.pre("validate", function () {
    if (!this.isGroup && this.participants.length !== 2) {
        throw new Error("Private chat must have exactly 2 participants");
    }
    if (this.isGroup && this.participants.length < 1) {
        throw new Error("Group chat must have at least 1 participant");
    }

    if (this.isGroup) {
        const adminCount = this.participants.filter(p => p.role === "admin").length;

        if (adminCount === 0) {
            throw new Error("Group must have at least one admin");
        }
    }

    if (!this.isGroup) {
        const hasAdmin = this.participants.some(p => p.role === "admin");
        if (hasAdmin) {
            throw new Error("Private chat cannot have admin role");
        }
    }

    const userIds = this.participants.map(p => p.user.toString());
    const uniqueUserIds = new Set(userIds);

    if (userIds.length !== uniqueUserIds.size) {
        throw new Error("Duplicate users are not allowed in participants");
    }
});

export default model('Conversation', conversationSchema);