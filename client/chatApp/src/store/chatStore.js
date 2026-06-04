import { create } from "zustand";

export const useChatStore = create((set) => ({
  conversations: [],
  selectedChat: null,
  loading: false,
  drafts: {},

  // 📝 set draft message for a chat
  setDraft: (conversationId, text) =>
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: text },
    })),

  // 📥 set all chats
  setConversations: (chats) => set({ conversations: chats }),

  // 🔄 add new chat (to top)
  addConversation: (chat) =>
    set((state) => ({
      conversations: [chat, ...state.conversations],
    })),

  // 🎯 select chat
  setSelectedChat: (chat) => set({ selectedChat: chat }),

  // ⏳ loading state
  setLoading: (value) => set({ loading: value }),

  // 📝 update a conversation in list (e.g., last message, unread)
  updateConversation: (conversationId, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, ...data } : c
      ),
    })),

  // 🗑️ remove conversation from list
  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter(
        (c) => c._id !== conversationId
      ),
      // Clear selected if it's the one being removed
      selectedChat:
        state.selectedChat?._id === conversationId
          ? null
          : state.selectedChat,
    })),

  // 📩 update last message and move conversation to top of list
  updateLastMessage: (conversationId, message) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId
          ? { ...c, lastMessage: message, lastMessageAt: new Date().toISOString() }
          : c
      );
      // Sort by lastMessageAt descending so most recent is first
      updated.sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );
      return { conversations: updated };
    }),

  // 🔔 increment unread count for a conversation (new message in non-active chat)
  incrementUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId
          ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ),
    })),

  // ✅ clear unread count when a chat is opened/read
  clearUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),
}));