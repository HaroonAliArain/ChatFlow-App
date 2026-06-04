import { create } from "zustand";

export const useMessageStore = create((set) => ({
  messages: [],
  loading: false,
  replyTo: null,
  editingMessage: null,
  forwardingMessage: null,

  // 📥 set all messages
  setMessages: (msgs) => set({ messages: msgs }),

  // ➕ add new message (prevents duplicates)
  addMessage: (msg) =>
    set((state) => {
      // Prevent duplicate messages
      if (state.messages.some((m) => m._id === msg._id)) return state;
      return { messages: [...state.messages, msg] };
    }),

  // 📝 update a message
  updateMessage: (updatedMsg) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === updatedMsg._id ? { ...m, ...updatedMsg } : m
      ),
    })),

  // 🗑️ remove a message
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== id),
    })),

  // 🔄 replace temp message with server-confirmed message (optimistic update)
  replaceTempMessage: (tempId, confirmedMsg) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === tempId ? confirmedMsg : m
      ),
    })),

  // ✅ update message status (sent → delivered → seen)
  updateMessageStatus: (messageId, status, timestamp) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId
          ? {
              ...m,
              status,
              ...(status === "delivered" && { deliveredAt: timestamp }),
              ...(status === "seen" && { seenAt: timestamp }),
            }
          : m
      ),
    })),

  // ✅ mark all messages in view as seen
  markAllAsSeen: (conversationId, userId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.conversation === conversationId &&
        (m.senderId?._id || m.senderId) !== userId &&
        m.status !== "seen"
          ? { ...m, status: "seen", seenAt: new Date().toISOString() }
          : m
      ),
    })),

  // 💬 reply to a message
  setReplyTo: (message) => set({ replyTo: message }),
  clearReplyTo: () => set({ replyTo: null }),

  // ✏️ editing mode
  setEditingMessage: (message) => set({ editingMessage: message }),
  clearEditingMessage: () => set({ editingMessage: null }),

  // ↪️ forwarding mode
  setForwardingMessage: (message) => set({ forwardingMessage: message }),
  clearForwardingMessage: () => set({ forwardingMessage: null }),

  // ⏳ loading
  setLoading: (value) => set({ loading: value }),
}));