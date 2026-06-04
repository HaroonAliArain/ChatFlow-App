import { useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useMessageStore } from "../../store/messageStore";
import { forwardMessage } from "../../services/messageService";
import Avatar from "../common/Avatar";
import { IoClose, IoSearch, IoArrowForward, IoCheckmarkCircle } from "react-icons/io5";

const ForwardModal = () => {
  const { forwardingMessage, clearForwardingMessage } = useMessageStore();
  const conversations = useChatStore((state) => state.conversations);
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { updateLastMessage } = useChatStore();
  const { addMessage } = useMessageStore();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  if (!forwardingMessage) return null;

  const filtered = conversations.filter((chat) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (chat.isGroup) return chat.groupName?.toLowerCase().includes(q);
    return chat.participants?.some((p) => p.user?.name?.toLowerCase().includes(q));
  });

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.groupName;
    const other = chat.participants?.find(
      (p) => (p.user?._id || p.user) !== currentUser?.id
    );
    return other?.user?.name || "Unknown";
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return chat.groupImage;
    const other = chat.participants?.find(
      (p) => (p.user?._id || p.user) !== currentUser?.id
    );
    return other?.user?.profilePicture;
  };

  const handleForward = async (targetChat) => {
    if (sending) return;
    setSending(true);
    try {
      const res = await forwardMessage(forwardingMessage._id, targetChat._id);
      const forwardedMsg = res.data;

      if (forwardedMsg) {
        // Update sidebar last message for the TARGET conversation
        updateLastMessage(targetChat._id, forwardedMsg);

        // Only add to message list if the TARGET conversation is currently open
        if (selectedChat?._id === targetChat._id) {
          addMessage(forwardedMsg);
        }
      }

      setSentTo(targetChat._id);
      setTimeout(() => {
        clearForwardingMessage();
        setSentTo(null);
      }, 800);
    } catch (err) {
      console.log("Forward error", err);
      alert("Failed to forward message");
    } finally {
      setSending(false);
    }
  };

  // Preview the message content
  const previewContent = forwardingMessage.content
    ? forwardingMessage.content.substring(0, 80) + (forwardingMessage.content.length > 80 ? "..." : "")
    : forwardingMessage.mediaUrl
    ? "📷 Image"
    : "Message";

  return (
    <div className="forward-modal-overlay" onClick={() => clearForwardingMessage()}>
      <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <h3 className="text-base font-semibold text-app">Forward message</h3>
          <button
            onClick={() => clearForwardingMessage()}
            className="p-1.5 hover:bg-app-hover rounded-full cursor-pointer transition-colors"
          >
            <IoClose size={18} className="text-app-secondary" />
          </button>
        </div>

        {/* Message preview */}
        <div className="px-5 py-3 bg-app-secondary border-b border-app">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 rounded-full" style={{ background: "var(--accent)" }} />
            <p className="text-xs text-app-secondary truncate flex-1">{previewContent}</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-tertiary" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ maxHeight: "350px" }}>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-app-tertiary py-6">No conversations found</p>
          ) : (
            filtered.map((chat) => (
              <button
                key={chat._id}
                onClick={() => handleForward(chat)}
                disabled={sending || sentTo === chat._id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-app-hover transition-colors mb-0.5"
              >
                <Avatar src={getChatAvatar(chat)} name={getChatName(chat)} size="md" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-app truncate">{getChatName(chat)}</p>
                  <p className="text-[11px] text-app-tertiary truncate">
                    {chat.isGroup ? `${chat.participants?.length || 0} members` : ""}
                  </p>
                </div>
                {sentTo === chat._id ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                    <IoCheckmarkCircle size={16} /> Sent
                  </span>
                ) : (
                  <IoArrowForward size={16} className="text-app-tertiary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
