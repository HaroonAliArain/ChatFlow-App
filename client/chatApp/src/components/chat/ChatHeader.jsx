import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useSocketStore } from "../../store/socketStore";
import { useMessageStore } from "../../store/messageStore";
import { searchMessages } from "../../services/messageService";
import { deleteConversation, leaveGroup as leaveGroupService } from "../../services/conversationService";
import ConfirmDialog from "../common/ConfirmDialog";
import Avatar from "../common/Avatar";
import { formatLastSeen } from "../../utils/formatTime";
import {
  IoArrowBack, IoCall, IoVideocam, IoEllipsisVertical, IoSearch, IoClose,
  IoTrash, IoExitOutline, IoChevronBack
} from "react-icons/io5";

const ChatHeader = ({ onBackClick, onInfoClick }) => {
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { removeConversation, setSelectedChat } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const { onlineUsers, typingUsers } = useSocketStore();
  const { messages, setMessages } = useMessageStore();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreButtonRef = useRef(null);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClick = (e) => {
      if (moreButtonRef.current?.contains(e.target)) return;
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showMoreMenu]);

  if (!selectedChat) return null;

  const isGroup = selectedChat.isGroup;
  const otherParticipant = !isGroup
    ? selectedChat.participants?.find((p) => (p.user?._id || p.user) !== currentUser?.id)
    : null;

  const chatName = isGroup ? selectedChat.groupName : otherParticipant?.user?.name || "Unknown";
  const chatAvatar = isGroup ? selectedChat.groupImage : otherParticipant?.user?.profilePicture;
  const otherUserId = otherParticipant?.user?._id || otherParticipant?.user;
  const isOnline = !isGroup && onlineUsers.includes(otherUserId);
  const isTyping = typingUsers[selectedChat._id];

  // Build subtitle — include "You" for group chats
  let subtitle = "";
  if (isTyping) {
    subtitle = "typing...";
  } else if (isGroup) {
    const participants = selectedChat.participants || [];
    const otherMembers = participants
      .filter((p) => (p.user?._id || p.user) !== currentUser?.id)
      .map((p) => p.user?.name || "Unknown");

    const MAX_NAMES = 3;
    const allNames = ["You", ...otherMembers];
    if (allNames.length <= MAX_NAMES + 1) {
      subtitle = allNames.join(", ");
    } else {
      const shown = allNames.slice(0, MAX_NAMES + 1).join(", ");
      const remaining = allNames.length - MAX_NAMES - 1;
      subtitle = `${shown}, +${remaining} more`;
    }
  } else {
    subtitle = formatLastSeen(otherParticipant?.user?.lastSeen, isOnline);
  }

  // ── Search Handlers ──
  const handleSearchToggle = () => {
    const next = !showSearch;
    setShowSearch(next);
    setSearchQuery("");
    setSearchResults([]);
    setShowMoreMenu(false);
    if (next) setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setSearchResults([]); return; }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMessages(selectedChat._id, query);
        const results = data.data || [];

        if (results.length > 0) {
          setSearchResults(results);
        } else {
          const q = query.toLowerCase();
          const localResults = messages
            .filter((m) => m.content?.toLowerCase().includes(q) && !m.isDeleted)
            .slice(0, 20);
          setSearchResults(localResults);
        }
      } catch (err) {
        console.log("Search error:", err);
        const q = query.toLowerCase();
        const localResults = messages
          .filter((m) => m.content?.toLowerCase().includes(q) && !m.isDeleted)
          .slice(0, 20);
        setSearchResults(localResults);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleResultClick = (msg) => {
    const el = document.getElementById(`msg-${msg._id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("msg-highlight");
      setTimeout(() => el.classList.remove("msg-highlight"), 2000);
    }
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Find current user role in group
  const myParticipant = selectedChat.participants?.find(
    (p) => (p.user?._id || p.user) === currentUser?.id
  );
  const isAdmin = isGroup && myParticipant?.role === "admin";

  // ── Three-dot Menu Actions (only search, clear, delete, leave) ──
  const handleDeleteChat = () => {
    setShowMoreMenu(false);
    setConfirm({
      title: isGroup ? "Delete Group" : "Delete Chat",
      message: `Delete this ${isGroup ? "group" : "conversation"}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteConversation(selectedChat._id);
          removeConversation(selectedChat._id);
          setSelectedChat(null);
        } catch (err) {
          console.log("Delete chat error:", err);
          alert("Failed to delete conversation");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  const handleClearChat = () => {
    setShowMoreMenu(false);
    setConfirm({
      title: "Clear Chat",
      message: "Clear all messages from this chat? Messages will only be removed from your view.",
      confirmText: "Clear",
      cancelText: "Cancel",
      variant: "warning",
      onConfirm: () => {
        setMessages([]);
      },
      onCancel: () => setConfirm(null)
    });
  };

  const handleLeaveGroup = () => {
    setShowMoreMenu(false);
    setConfirm({
      title: "Leave Group",
      message: "Are you sure you want to leave this group? You will no longer receive messages.",
      confirmText: "Leave",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await leaveGroupService(selectedChat._id);
          removeConversation(selectedChat._id);
          setSelectedChat(null);
        } catch (err) {
          console.log("Leave group error:", err);
          alert("Failed to leave group");
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  return (
    <div className="relative">
      <div className="chat-header-bar">
        {/* LEFT: avatar, name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackClick && (
            <button
              onClick={onBackClick}
              className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-app-hover hover:bg-app-selected border border-app text-app hover:text-accent hover:border-accent hover:scale-105 active:scale-95 transition-all cursor-pointer mr-0.5 shadow-sm"
              title="Back to Chats"
            >
              <IoChevronBack size={15} />
            </button>
          )}
          <div className="cursor-pointer flex-shrink-0" onClick={onInfoClick}>
            <Avatar src={chatAvatar} name={chatName} size="md" isOnline={isOnline} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[13px] sm:text-[15px] text-app truncate leading-tight">{chatName}</h3>
            <p className={`text-[10px] sm:text-xs mt-0.5 truncate transition-colors ${
              isTyping ? "text-accent font-medium chat-typing-text"
                : isOnline ? "text-green-500 font-medium"
                : "text-app-tertiary"
            }`}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* RIGHT: 3-dot menu */}
        <div className="flex items-center gap-0.5">

          {/* ── Three-dot menu (clean: only search, clear, delete) ── */}
          <div className="relative">
            <button
              ref={moreButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((prev) => !prev);
                setShowSearch(false);
              }}
              className={`chat-header-btn ${showMoreMenu ? "text-accent bg-accent-light" : ""}`}
              title="More options">
              <IoEllipsisVertical size={17} />
            </button>

            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className="fixed z-[9999] bg-app rounded-xl border border-app-secondary py-1.5 min-w-[210px] animate-scale-in"
                style={{
                  top: (moreButtonRef.current?.getBoundingClientRect()?.bottom || 50) + 4,
                  right: 16,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
                }}
                onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setShowMoreMenu(false); handleSearchToggle(); }} className="ctx-menu-btn">
                  <IoSearch size={15} className="text-app-secondary" /> Search messages
                </button>
                <div className="mx-2 my-1 h-px bg-[var(--border-primary)]" />
                <button onClick={handleClearChat} className="ctx-menu-btn">
                  <IoExitOutline size={15} className="text-orange-500" /> Clear chat
                </button>
                {isGroup && (
                  <button onClick={handleLeaveGroup} className="ctx-menu-btn text-orange-500">
                    <IoExitOutline size={15} /> Leave Group
                  </button>
                )}
                {(!isGroup || isAdmin) && (
                  <button onClick={handleDeleteChat} className="ctx-menu-btn text-red-500">
                    <IoTrash size={15} /> {isGroup ? "Delete Group" : "Delete Chat"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search overlay bar ── */}
      {showSearch && (
        <div className="absolute top-full left-0 right-0 z-20 bg-app border-b border-app px-4 py-2.5 animate-fade-in shadow-app-md">
          <div className="flex items-center gap-2">
            <IoSearch size={16} className="text-app-tertiary flex-shrink-0" />
            <input ref={searchInputRef} type="text" value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search in conversation..."
              className="flex-1 bg-transparent text-sm text-app outline-none placeholder:text-app-tertiary"
              autoFocus
            />
            {searching && (
              <svg className="w-4 h-4 animate-spin text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            <button onClick={handleSearchToggle} className="p-1 hover:bg-app-hover rounded-full cursor-pointer transition-colors">
              <IoClose size={16} className="text-app-tertiary" />
            </button>
          </div>

          {searchQuery.trim() && (
            <div className="mt-2 max-h-60 overflow-y-auto border-t border-app pt-2">
              {searchResults.length === 0 && !searching ? (
                <p className="text-xs text-app-tertiary text-center py-3">No messages found</p>
              ) : (
                searchResults.map((msg) => (
                  <button key={msg._id} onClick={() => handleResultClick(msg)}
                    className="w-full text-left px-3 py-2 hover:bg-app-hover rounded-lg transition-colors cursor-pointer mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-accent">{msg.senderId?.name || "User"}</span>
                      <span className="text-[10px] text-app-tertiary">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-app truncate mt-0.5">{msg.content}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <ConfirmDialog config={confirm} />
    </div>
  );
};

export default ChatHeader;
