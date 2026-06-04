import { Schema, model } from "mongoose";

const notificationSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  type: {
    type: String,
    enum: ["message", "reaction", "reply"],
    default: "message"
  },
  message: {
    type: Schema.Types.ObjectId,
    ref: "Message"
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation"
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default model("Notification", notificationSchema);