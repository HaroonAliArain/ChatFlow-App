import { create } from "zustand";
import socket from "../services/socket";
import { useAuthStore } from "./authStore";
import { useMessageStore } from "./messageStore";
import { useChatStore } from "./chatStore";
import { useThemeStore } from "./themeStore";
import { SOCKET_EVENTS } from "../utils/constants";
import { playNotificationSound as playChime } from "../utils/notificationSound";

export const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: [],
  typingUsers: {},
  isConnected: false,

  // 🔌 Connect socket with JWT token
  connectSocket: () => {
    const token = useAuthStore.getState().token;

    if (!token) return;
    if (socket.connected) return; // prevent duplicate connections

    socket.auth = { token };
    socket.connect();

    set({ socket });

    // ── Online users ──
    socket.on(SOCKET_EVENTS.GET_ONLINE_USERS, (users) => {
      set({ onlineUsers: users });
    });

    // ── Receive message (from REST-based sends) ──
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE_REST, (message) => {
      console.log("📩 Socket received REST message event (receiveMessage):", message);
      const { addMessage } = useMessageStore.getState();
      const { selectedChat, updateLastMessage } = useChatStore.getState();

      const convId = message.conversation || message.conversationId;

      // Only add to message list if this conversation is currently open
      if (selectedChat?._id === convId) {
        addMessage(message);
      } else {
        // Increment unread count for non-active chats
        useChatStore.getState().incrementUnreadCount(convId);
        get().playNotificationSound();
      }

      // Update sidebar last message
      updateLastMessage(convId, message);
    });

    // ── Receive message (from socket-based sends) ──
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (message) => {
      console.log("📩 Socket received Socket message event (receive_message):", message);
      const { addMessage } = useMessageStore.getState();
      const { selectedChat, updateLastMessage } = useChatStore.getState();

      const convId = message.conversation || message.conversationId;

      if (selectedChat?._id === convId) {
        addMessage(message);
      } else {
        // Increment unread count for non-active chats
        useChatStore.getState().incrementUnreadCount(convId);
        get().playNotificationSound();
      }

      updateLastMessage(convId, message);
    });

    // ── Message status updated ──
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, ({ messageId, status, deliveredAt }) => {
      const { updateMessageStatus } = useMessageStore.getState();
      updateMessageStatus(messageId, status, deliveredAt);
    });

    // ── Bulk messages seen ──
    socket.on(SOCKET_EVENTS.MESSAGES_SEEN, ({ conversationId, userId: seenByUserId }) => {
      const { markAllAsSeen } = useMessageStore.getState();
      const currentUser = useAuthStore.getState().user;
      // Only update if it was the OTHER user who marked our messages as seen
      if (seenByUserId !== currentUser?.id) {
        markAllAsSeen(conversationId, seenByUserId);
      }
    });

    // ── Typing indicator ──
    socket.on(SOCKET_EVENTS.TYPING, ({ conversationId, isTyping }) => {
      set((state) => {
        if (isTyping) {
          return {
            typingUsers: { ...state.typingUsers, [conversationId]: true },
          };
        } else {
          const updated = { ...state.typingUsers };
          delete updated[conversationId];
          return { typingUsers: updated };
        }
      });
    });

    // ── Pending messages (offline queue) ──
    socket.on(SOCKET_EVENTS.PENDING_MESSAGES, (messages) => {
      const { addMessage } = useMessageStore.getState();
      const { selectedChat, updateLastMessage } = useChatStore.getState();

      messages.forEach((msg) => {
        if (selectedChat?._id === msg.conversation) {
          addMessage(msg);
        }
        updateLastMessage(msg.conversation, msg);
      });

      if (messages.length > 0) {
        get().playNotificationSound();
      }
    });

    // ── Message deleted (real-time) ──
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, ({ messageId }) => {
      const { updateMessage } = useMessageStore.getState();
      updateMessage({
        _id: messageId,
        content: "This message was deleted",
        isDeleted: true,
        mediaUrl: null,
      });
    });

    // ── Message edited (real-time) ──
    socket.on(SOCKET_EVENTS.MESSAGE_EDITED, ({ messageId, content, isEdited, editedAt }) => {
      const { messages } = useMessageStore.getState();
      const existingMsg = messages.find((m) => m._id === messageId);
      if (existingMsg) {
        useMessageStore.getState().updateMessage({
          ...existingMsg,
          content,
          isEdited,
          editedAt,
        });
      }
    });

    // ── New notification ──
    socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, () => {
      get().playNotificationSound();
    });

    // ── Message reacted (real-time) ──
    socket.on(SOCKET_EVENTS.MESSAGE_REACTED, ({ messageId, reactions }) => {
      console.log("📩 Socket received message_reacted:", { messageId, reactions });
      const { messages, updateMessage } = useMessageStore.getState();
      const existingMsg = messages.find((m) => m._id === messageId);
      if (existingMsg) {
        updateMessage({
          ...existingMsg,
          reactions,
        });
      }
    });

    // ── Sync messages on reconnect ──
    socket.on(SOCKET_EVENTS.SYNC_MESSAGES, ({ messages }) => {
      const { addMessage } = useMessageStore.getState();
      const { selectedChat } = useChatStore.getState();

      messages.forEach((msg) => {
        if (selectedChat?._id === msg.conversation) {
          addMessage(msg);
        }
      });
    });

    // ── Connection events ──
    socket.on("connect", () => {
      console.log("🟢 Socket connected successfully! ID:", socket.id);
      set({ isConnected: true });
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected. Reason:", reason);
      set({ isConnected: false });
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket connection error:", err.message);
      set({ isConnected: false });
    });
  },

  // 🔌 Disconnect socket
  disconnectSocket: () => {
    socket.removeAllListeners();
    socket.disconnect();
    set({ socket: null, onlineUsers: [], typingUsers: {}, isConnected: false });
  },

  // 📥 Join a conversation room
  joinChat: (conversationId) => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.JOIN_CHAT, conversationId);
    }
  },

  // 📤 Leave a conversation room
  leaveChat: (conversationId) => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.LEAVE_CHAT, conversationId);
    }
  },

  // ⌨️ Emit typing start
  emitTyping: (conversationId) => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.TYPING_START, conversationId);
    }
  },

  // ⌨️ Emit typing stop
  emitStopTyping: (conversationId) => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, conversationId);
    }
  },

  // 👁️ Emit message seen
  emitMessageSeen: (conversationId) => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, { conversationId });
    }
  },

  // 🔊 Play notification sound (respects user preferences)
  playNotificationSound: () => {
    try {
      const { notifications } = useThemeStore.getState();

      // Don't play if notifications are disabled or sounds are off
      if (!notifications.enableAll || !notifications.sounds) return;

      playChime(0.8);
    } catch {
      // Fail silently
    }
  },

  // 🔍 Check if a user is online
  isUserOnline: (userId) => {
    return get().onlineUsers.includes(userId);
  },
}));