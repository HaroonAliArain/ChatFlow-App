// Socket event names — prevents typos
export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_CHAT: "join_chat",
  LEAVE_CHAT: "leave_chat",
  SEND_MESSAGE: "send_message",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_SEEN: "message_seen",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  FETCH_MESSAGES: "fetch_messages",
  RECONNECT_SYNC: "reconnect_sync",
  DELETE_MESSAGE: "delete_message",

  // Server → Client
  RECEIVE_MESSAGE: "receive_message",
  RECEIVE_MESSAGE_REST: "receiveMessage",
  MESSAGE_STATUS_UPDATED: "message_status_updated",
  MESSAGES_SEEN: "messages_seen",
  TYPING: "typing",
  PENDING_MESSAGES: "pending_messages",
  SYNC_MESSAGES: "sync_messages",
  GET_ONLINE_USERS: "getOnlineUsers",
  MESSAGE_DELETED: "message_deleted",
  MESSAGE_EDITED: "message_edited",
  NEW_NOTIFICATION: "new_notification",
  MESSAGE_REACTED: "message_reacted",
};

// Message status
export const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  SEEN: "seen",
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  FILE: "file",
};

// Default images
export const DEFAULTS = {
  AVATAR: "https://ui-avatars.com/api/?background=6366f1&color=fff&name=",
  GROUP_AVATAR: "/avatars/defaultGroupImage.png",
};

// Typing debounce delay (ms)
export const TYPING_DEBOUNCE = 1500;
