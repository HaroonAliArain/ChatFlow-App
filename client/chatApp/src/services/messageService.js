import api from "./api";

// 📥 Get messages of a conversation
export const getMessages = async (conversationId) => {
  const res = await api.get(`/messages/${conversationId}`);
  return res.data;
};

// 📤 Send message
export const sendMessage = async (data) => {
  const res = await api.post("/messages", data);
  return res.data;
};

// ❌ Delete message
export const deleteMessage = async (messageId) => {
  const res = await api.delete(`/messages/${messageId}`);
  return res.data;
};

// ✏️ Edit message
export const editMessage = async (messageId, data) => {
  const res = await api.put(`/messages/edit/${messageId}`, data);
  return res.data;
};

// 👁️ Mark messages as seen
export const markAsSeen = async (conversationId) => {
  const res = await api.put(`/messages/seen/${conversationId}`);
  return res.data;
};

// ✅ Mark messages as delivered
export const markAsDelivered = async (conversationId) => {
  const res = await api.put(`/messages/delivered/${conversationId}`);
  return res.data;
};

// 🔍 Search messages in a conversation
export const searchMessages = async (conversationId, query) => {
  const res = await api.get(`/messages/search`, {
    params: { conversationId, query },
  });
  return res.data;
};

// 😀 React to message
export const reactToMessage = async (messageId, emoji) => {
  const res = await api.put(`/messages/react/${messageId}`, { emoji });
  return res.data;
};

// 🚫 Remove reaction
export const removeReaction = async (messageId) => {
  const res = await api.delete(`/messages/react/${messageId}`);
  return res.data;
};

// 📬 Get unread count for a conversation
export const getUnreadCount = async (conversationId) => {
  const res = await api.get(`/messages/unread/${conversationId}`);
  return res.data;
};

// ↪️ Forward message to another conversation
export const forwardMessage = async (messageId, conversationId) => {
  const res = await api.post("/messages/forward", { messageId, conversationId });
  return res.data;
};