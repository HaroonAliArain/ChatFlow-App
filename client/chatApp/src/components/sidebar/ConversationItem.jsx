import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { useSocketStore } from "../../store/socketStore";
import { useChatStore } from "../../store/chatStore";
import { deleteConversation, toggleMuteChat, togglePinChat } from "../../services/conversationService";
import Avatar from "../common/Avatar";
import { formatSidebarTime } from "../../utils/formatTime";
import { IoTrash, IoCheckmarkDone, IoVolumeMute, IoVolumeHigh, IoPin } from "react-icons/io5";
import ConfirmDialog from "../common/ConfirmDialog";

const ConversationItem = ({ chat }) => {
  const currentUser = useAuthStore((state) => state.user);
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { removeConversation, clearUnreadCount, updateConversation } = useChatStore();
  const { onlineUsers, typingUsers } = useSocketStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const menuRef = useRef(null);

  const isSelected = selectedChat?._id === chat._id;
  const isTyping = typingUsers[chat._id];
  const isMuted = chat.isMuted || false;
  const isPinned = chat.isPinned || false;

  const otherParticipant = !chat.isGroup
    ? chat.participants?.find(
        (p) => {
          const pUserId = p.user?._id || p.user;
          return pUserId && pUserId.toString() !== currentUser?.id;
        }
      )
    : null;

  const chatName = chat.isGroup
    ? chat.groupName
    : otherParticipant?.user?.name || "Unknown";

  const chatAvatar = chat.isGroup
    ? chat.groupImage
    : otherParticipant?.user?.profilePicture;

  const otherUserId = otherParticipant?.user?._id || otherParticipant?.user;
  const isOnline = !chat.isGroup && onlineUsers.includes(otherUserId);

  let lastMsgPreview = "No messages yet";
  if (isTyping) {
    lastMsgPreview = "typing...";
  } else if (chat.lastMessage) {
    if (chat.lastMessage.isDeleted) {
      lastMsgPreview = "🚫 This message was deleted";
    } else {
      const isMine = (chat.lastMessage.senderId?._id || chat.lastMessage.senderId) === currentUser?.id;
      const prefix = isMine ? "You: " : "";
      const fwdPrefix = chat.lastMessage.isForwarded ? "↪ " : "";

      // Determine preview text based on message type
      let msgText = "";
      const msgType = chat.lastMessage.messageType;
      if (msgType === "image") {
        msgText = "📷 Image";
      } else if (msgType === "file") {
        msgText = `📎 ${chat.lastMessage.content || "Document"}`;
      } else if (chat.lastMessage.content) {
        // For old "📎 filename\nURL" pattern, only show first line
        const content = chat.lastMessage.content;
        if (content.startsWith("📎 ") && content.includes("\n")) {
          msgText = content.split("\n")[0];
        } else {
          msgText = content;
        }
      } else {
        msgText = "📷 Image";
      }

      lastMsgPreview = prefix + fwdPrefix + msgText;
    }
  }

  // ── Right-click handler ──
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position, keep menu within viewport
    const x = e.clientX;
    const y = e.clientY;
    setContextMenu({ x, y });
  };

  // ── Close context menu on outside click or scroll ──
  useEffect(() => {
    if (!contextMenu) return;

    const handleClose = () => setContextMenu(null);
    document.addEventListener("click", handleClose);
    document.addEventListener("scroll", handleClose, true);
    document.addEventListener("contextmenu", handleClose);

    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("scroll", handleClose, true);
      document.removeEventListener("contextmenu", handleClose);
    };
  }, [contextMenu]);

  // ── Menu actions ──
  const handleMarkAsRead = (e) => {
    e.stopPropagation();
    clearUnreadCount(chat._id);
    setContextMenu(null);
  };

  const handleMuteToggle = async (e) => {
    e.stopPropagation();
    setContextMenu(null);
    try {
      const res = await toggleMuteChat(chat._id);
      updateConversation(chat._id, { isMuted: res.isMuted });
    } catch (err) {
      console.log("Mute error:", err);
      // Fallback toggle
      updateConversation(chat._id, { isMuted: !isMuted });
    }
  };

  const handlePinToggle = async (e) => {
    e.stopPropagation();
    setContextMenu(null);
    try {
      const res = await togglePinChat(chat._id);
      updateConversation(chat._id, { isPinned: res.isPinned });
    } catch (err) {
      console.log("Pin error:", err);
      // Fallback toggle
      updateConversation(chat._id, { isPinned: !isPinned });
    }
  };

  const handleDeleteChat = (e) => {
    e.stopPropagation();
    setContextMenu(null);

    setConfirm({
      title: chat.isGroup ? "Delete Group" : "Delete Chat",
      message: `Delete ${chat.isGroup ? "group" : "conversation"} "${chatName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteConversation(chat._id);
          removeConversation(chat._id);
        } catch (err) {
          console.log("Delete conversation error:", err);
          alert("Failed to delete conversation");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 animate-slide-in ${
          isSelected ? "bg-app-selected" : "hover:bg-app-hover"
        }`}
      >
        <Avatar src={chatAvatar} name={chatName} size="md" isOnline={isOnline} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <h3 className={`text-sm font-semibold truncate ${isSelected ? "text-accent" : "text-app"}`}>
                {chatName}
              </h3>
              {isMuted && <IoVolumeMute size={11} className="mute-indicator flex-shrink-0" />}
              {isPinned && <IoPin size={11} className="pin-indicator flex-shrink-0" />}
            </div>
            <span className="text-[10px] text-app-tertiary flex-shrink-0 ml-2">
              {formatSidebarTime(chat.lastMessageAt || chat.updatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className={`text-xs truncate ${isTyping ? "text-accent font-medium" : "text-app-secondary"}`}>
              {lastMsgPreview}
            </p>
            {chat.unreadCount > 0 && (
              <span className="ml-2 bg-accent text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Context Menu (Portal-like, fixed position) ── */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 animate-scale-in"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div
            className="bg-app border border-app-secondary rounded-xl shadow-lg py-1.5 min-w-[180px] overflow-hidden"
            style={{
              boxShadow: "0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Mark as read */}
            {chat.unreadCount > 0 && (
              <button
                onClick={handleMarkAsRead}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-app hover:bg-app-hover transition-colors cursor-pointer"
              >
                <IoCheckmarkDone size={16} className="text-accent" />
                <span>Mark as read</span>
              </button>
            )}

            {/* Mute */}
            <button
              onClick={handleMuteToggle}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-app hover:bg-app-hover transition-colors cursor-pointer"
            >
              {isMuted ? (
                <><IoVolumeHigh size={16} className="text-green-500" /><span>Unmute notifications</span></>
              ) : (
                <><IoVolumeMute size={16} className="text-app-secondary" /><span>Mute notifications</span></>
              )}
            </button>

            {/* Pin */}
            <button
              onClick={handlePinToggle}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-app hover:bg-app-hover transition-colors cursor-pointer"
            >
              <IoPin size={16} className={isPinned ? "text-accent" : "text-app-secondary"} />
              <span>{isPinned ? "Unpin chat" : "Pin chat"}</span>
            </button>

            {/* Divider */}
            <div className="border-t border-app-secondary mx-2 my-1" />

            {/* Delete */}
            <button
              onClick={handleDeleteChat}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <IoTrash size={16} />
              <span>Delete chat</span>
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog config={confirm} />
    </>
  );
};

export default ConversationItem;