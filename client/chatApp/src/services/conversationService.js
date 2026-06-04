import api from "./api";

// 📥 Get all conversations
export const getConversations = async () => {
  const res = await api.get("/conversations");
  return res.data;
};

// ➕ Create private chat
export const createPrivateChat = async (receiverId) => {
  const res = await api.post("/conversations/private", { receiverId });
  return res.data;
};

// 👥 Create group chat
export const createGroupChat = async (data) => {
  const res = await api.post("/conversations/group", data);
  return res.data;
};

// ➕ Add member to group
export const addGroupMember = async (conversationId, newMemberId) => {
  const res = await api.put(`/conversations/${conversationId}/add-member`, {
    newMemberId,
  });
  return res.data;
};

// ➖ Remove member from group
export const removeGroupMember = async (conversationId, memberId) => {
  const res = await api.put(`/conversations/${conversationId}/remove-member`, {
    memberId,
  });
  return res.data;
};

// ✏️ Update group info
export const updateGroupInfo = async (conversationId, data) => {
  const res = await api.put(
    `/conversations/${conversationId}/update-group`,
    data
  );
  return res.data;
};

// 🗑️ Delete conversation
export const deleteConversation = async (conversationId) => {
  const res = await api.delete(`/conversations/${conversationId}/delete`);
  return res.data;
};

// 🔇 Toggle mute notifications
export const toggleMuteChat = async (conversationId) => {
  const res = await api.put(`/conversations/${conversationId}/mute`);
  return res.data;
};

// 📌 Toggle pin chat
export const togglePinChat = async (conversationId) => {
  const res = await api.put(`/conversations/${conversationId}/pin`);
  return res.data;
};

// 🚪 Leave group
export const leaveGroup = async (conversationId) => {
  const res = await api.put(`/conversations/${conversationId}/leave`);
  return res.data;
};