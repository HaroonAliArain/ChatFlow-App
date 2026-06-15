import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useMessageStore } from "../../store/messageStore";
import { useChatStore } from "../../store/chatStore";
import { formatMessageTime } from "../../utils/formatTime";
import { MESSAGE_STATUS } from "../../utils/constants";
import {
  IoCheckmark, IoCheckmarkDone, IoArrowUndo, IoCreate, IoTrash,
  IoPersonRemove, IoPeople, IoDownload, IoOpen, IoClose, IoDocumentText,
  IoArrowForward, IoChevronDown, IoCopy, IoEllipsisVertical
} from "react-icons/io5";
import { deleteMessage, reactToMessage, removeReaction } from "../../services/messageService";
import Avatar from "../common/Avatar";

const MessageBubble = ({ message }) => {
  const user = useAuthStore((state) => state.user);
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { setReplyTo, setEditingMessage, updateMessage, setForwardingMessage } = useMessageStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletedForMe, setDeletedForMe] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const menuRef = useRef(null);

  const senderId = message.senderId?._id || message.senderId;
  const isOwn = senderId === user?.id;
  const senderName = message.senderId?.name || "";
  const senderPicture = message.senderId?.profilePicture || "";
  const isGroup = selectedChat?.isGroup;
  const isTempMessage = message._id?.startsWith?.("temp-");

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowDeleteConfirm(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (!showImageViewer) return;
    const handleKey = (e) => { if (e.key === "Escape") setShowImageViewer(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showImageViewer]);

  // ── WhatsApp-style tick system (LARGE & visible) ──
  const renderStatus = () => {
    if (!isOwn) return null;
    if (isTempMessage) {
      return (
        <span className="tick-icon tick-sending" title="Sending...">
          <IoCheckmark size={18} />
        </span>
      );
    }
    switch (message.status) {
      case MESSAGE_STATUS.SEEN:
        return (
          <span className="tick-icon tick-seen" title="Read">
            <IoCheckmarkDone size={18} />
          </span>
        );
      case MESSAGE_STATUS.DELIVERED:
        return (
          <span className="tick-icon tick-delivered" title="Delivered">
            <IoCheckmarkDone size={18} />
          </span>
        );
      default:
        return (
          <span className="tick-icon tick-sent" title="Sent">
            <IoCheckmark size={18} />
          </span>
        );
    }
  };

  const handleDeleteForMe = () => {
    setShowMenu(false);
    setShowDeleteConfirm(false);
    setDeletedForMe(true);
  };

  const handleDeleteForEveryone = async () => {
    setShowMenu(false);
    setShowDeleteConfirm(false);
    try {
      await deleteMessage(message._id);
      updateMessage({ ...message, isDeleted: true, content: "This message was deleted" });
    } catch (err) {
      console.log("Delete error", err);
    }
  };

  /**
   * Fix Cloudinary URL for documents.
   * Cloudinary sometimes classifies PDFs/docs under /image/upload/ which breaks rendering.
   * We convert to /raw/upload/ for non-image file types.
   */
  const fixCloudinaryUrl = (url, name) => {
    if (!url || !url.includes("cloudinary.com")) return url;
    
    const ext = name?.split(".")?.pop()?.toLowerCase() || "";
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff"];
    const videoExts = ["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"];
    
    // If it's NOT an image or video, it should use /raw/upload/ 
    if (!imageExts.includes(ext) && !videoExts.includes(ext)) {
      return url.replace("/image/upload/", "/raw/upload/");
    }
    return url;
  };

  // Download file via public backend proxy — 100% reliable, bypasses CORS, preserves the original filename
  const handleDownload = (url, name) => {
    try {
      const fixedUrl = fixCloudinaryUrl(url, name);
      const baseUrl = import.meta.env.VITE_API_URL || "https://chatflow-app-7u34.onrender.com/api";
      const apiBase = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
      const downloadUrl = `${apiBase}/media/download?url=${encodeURIComponent(fixedUrl)}&filename=${encodeURIComponent(name)}`;
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.log("Proxy download error, falling back to direct original tab open:", err);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleForward = () => {
    setShowMenu(false);
    setForwardingMessage(message);
  };

  const handleCopy = () => {
    setShowMenu(false);
    navigator.clipboard.writeText(message.content || "");
  };

  const handleReact = async (emoji) => {
    const oldReactions = message.reactions || [];
    const userId = user?.id || user?._id;
    if (!userId) return;

    const optimisticUser = {
      _id: userId,
      id: userId,
      name: user?.name || "Me",
      profilePicture: user?.profilePicture || ""
    };

    const existingIndex = oldReactions.findIndex(r => {
      const rId = r.user?._id || r.user?.id || r.user;
      return rId === userId;
    });

    let newReactions;
    let isRemoving = false;

    if (existingIndex > -1) {
      if (oldReactions[existingIndex].emoji === emoji) {
        newReactions = oldReactions.filter((_, idx) => idx !== existingIndex);
        isRemoving = true;
      } else {
        newReactions = [...oldReactions];
        newReactions[existingIndex] = {
          ...newReactions[existingIndex],
          emoji: emoji
        };
      }
    } else {
      newReactions = [
        ...oldReactions,
        {
          user: optimisticUser,
          emoji: emoji
        }
      ];
    }

    // Apply Optimistic Update
    updateMessage({ ...message, reactions: newReactions });

    try {
      let res;
      if (isRemoving) {
        res = await removeReaction(message._id);
      } else {
        res = await reactToMessage(message._id, emoji);
      }
      updateMessage({ ...message, reactions: res.data });
    } catch (err) {
      console.log("Reaction error:", err);
      // Rollback on failure
      updateMessage({ ...message, reactions: oldReactions });
    }
  };

  // Deleted message placeholder
  if (message.isDeleted) {
    return (
      <div id={`msg-${message._id}`} className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-xs px-4 py-2 rounded-2xl text-xs bg-app-input text-app-tertiary italic border border-app flex items-center gap-1.5">
          <IoTrash size={12} /> This message was deleted
        </div>
      </div>
    );
  }

  if (deletedForMe) {
    return (
      <div id={`msg-${message._id}`} className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-xs px-4 py-2 rounded-2xl text-xs bg-app-input text-app-tertiary italic border border-app flex items-center gap-1.5">
          <IoPersonRemove size={12} /> You deleted this message
        </div>
      </div>
    );
  }

  const timeStr = formatMessageTime(message.createdAt);

  // ── Detect file messages (BOTH old pattern and new messageType) ──
  // Old pattern: content starts with "📎 filename\nURL"
  const isOldFilePattern = message.content?.startsWith("📎 ") && message.content?.includes("\n");
  // New pattern: messageType === "file" and mediaUrl exists
  const isNewFileType = message.messageType === "file" && message.mediaUrl;
  const isFileMessage = isOldFilePattern || isNewFileType;

  let displayFileName = "";
  let displayFileUrl = "";
  if (message.fileName) {
    displayFileName = message.fileName;
    displayFileUrl = message.mediaUrl;
  } else if (isOldFilePattern) {
    const parts = message.content.split("\n");
    displayFileName = parts[0].replace("📎 ", "").trim();
    displayFileUrl = parts.slice(1).join("\n").trim();
  } else if (isNewFileType) {
    displayFileName = message.content || "File";
    displayFileUrl = message.mediaUrl;
  }

  // File type label
  const getFileTypeLabel = (name) => {
    const ext = name?.split(".")?.pop()?.toLowerCase() || "";
    const typeMap = {
      pdf: "PDF Document", doc: "Word Document", docx: "Word Document",
      xls: "Excel Spreadsheet", xlsx: "Excel Spreadsheet",
      ppt: "PowerPoint", pptx: "PowerPoint",
      zip: "ZIP Archive", rar: "RAR Archive", "7z": "7-Zip Archive",
      txt: "Text File", csv: "CSV File", json: "JSON File",
      mp3: "Audio File", wav: "Audio File", ogg: "Audio File",
      mp4: "Video File", avi: "Video File", mkv: "Video File", webm: "Video File",
      html: "HTML File", css: "CSS File", js: "JavaScript File",
    };
    return typeMap[ext] || `${ext.toUpperCase() || "Unknown"} File`;
  };

  // Image message
  const isImage = message.messageType === "image" && message.mediaUrl;
  const isSticker = message.messageType === "sticker" && message.mediaUrl;
  const isVideo = message.messageType === "video" && message.mediaUrl;

  // Group reactions by emoji (WhatsApp style)
  const groupedReactions = message.reactions?.reduce((acc, current) => {
    const emojiStr = current.emoji;
    const existing = acc.find(r => r.emoji === emojiStr);
    if (existing) {
      existing.count += 1;
      existing.users.push(current.user?._id || current.user);
    } else {
      acc.push({
        emoji: emojiStr,
        count: 1,
        users: [current.user?._id || current.user]
      });
    }
    return acc;
  }, []) || [];

  return (
    <>
      <div id={`msg-${message._id}`}
        className={`flex flex-col mb-1 msg-bubble-wrapper ${isTempMessage ? "msg-sending" : ""}`}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); setShowDeleteConfirm(false); }}>

        {/* Top row: Avatar + message bubble */}
        <div className={`flex items-end ${isOwn ? "justify-end" : "justify-start"} w-full`}>
          {/* Receiver avatar (left side) */}
          {!isOwn && (
            <div className="flex-shrink-0 mb-0.5 msg-avatar-container msg-avatar-left">
              <Avatar src={senderPicture} name={senderName} size="sm" className="msg-avatar" />
            </div>
          )}

          <div className="relative group max-w-[260px] sm:max-w-[320px] md:max-w-[380px]">
            {/* Hover action bar */}
            {!isTempMessage && (
              <div className={`msg-hover-actions ${isOwn ? "msg-actions-own" : "msg-actions-other"}`}>
                <button
                  onClick={() => { setShowMenu(!showMenu); setShowDeleteConfirm(false); }}
                  className="msg-action-btn"
                  title="More Options"
                >
                  <IoEllipsisVertical size={13} />
                </button>
              </div>
            )}

            {/* Sender name (group chats, other users only) */}
            {!isOwn && isGroup && senderName && (
              <p className="text-[11px] font-semibold text-accent mb-0.5 ml-1">{senderName}</p>
            )}

            {/* Message bubble */}
            <div className={
              isSticker
                ? "bg-transparent border-none shadow-none p-0 flex flex-col items-center"
                : `msg-bubble text-[13px] sm:text-sm leading-relaxed px-2.5 sm:px-3.5 py-1.5 sm:py-2 ${
                    isOwn ? "msg-bubble-own rounded-2xl rounded-br-sm" : "msg-bubble-other rounded-2xl rounded-bl-sm"
                  }`
            }
            style={isSticker ? {} : {
              background: isOwn ? "var(--bubble-own-solid)" : "var(--bubble-other)",
              color: isOwn ? "#fff" : "var(--bubble-other-text)"
            }}>

              {/* ── Sticker ── */}
              {isSticker && (
                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-semibold mb-1 ${isOwn ? "text-app-tertiary" : "text-accent"}`}>
                    By {senderName || "User"}
                  </span>
                  <img
                    src={message.mediaUrl}
                    alt="Sticker"
                    className="w-24 h-24 object-contain animate-fade-in"
                    loading="lazy"
                  />
                  <div className="flex items-center gap-1.5 justify-end mt-1.5 w-full">
                    <span className="text-[10px] text-app-tertiary">{timeStr}</span>
                    {renderStatus()}
                  </div>
                </div>
              )}

              {/* ── Video ── */}
              {isVideo && (
                <div className="relative group/vid mb-1.5 w-full min-w-[160px] sm:min-w-[200px] max-w-[280px] sm:max-w-[320px] aspect-video">
                  <video
                    src={message.mediaUrl}
                    controls
                    className="rounded-lg w-full h-full object-contain bg-black"
                    preload="metadata"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(message.mediaUrl, message.fileName || "video.mp4"); }}
                      className="media-action-btn" title="Download video">
                      <IoDownload size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Forwarded badge */}
              {message.isForwarded && !isSticker && (
                <div className="forwarded-badge">
                  <IoArrowForward size={10} /> Forwarded
                </div>
              )}

              {/* Reply preview */}
              {message.replyTo && !isSticker && (
                <div className={`text-xs p-2 mb-1.5 rounded-lg border-l-2 ${
                  isOwn ? "bg-white/15 border-white/40" : "bg-app-input border-[var(--accent)]"
                }`}>
                  <p className={`font-semibold text-[11px] mb-0.5 ${isOwn ? "text-white/80" : "text-accent"}`}>
                    {message.replyTo?.senderId?.name || "User"}
                  </p>
                  <p className="truncate opacity-70">{message.replyTo?.content || ""}</p>
                </div>
              )}

              {/* ── Image ── */}
              {isImage && !isSticker && !isVideo && (
                <div className="relative group/img mb-1.5">
                  <img src={message.mediaUrl} alt="shared image"
                    className="rounded-lg max-w-full max-h-[200px] sm:max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    loading="lazy"
                    onClick={() => setShowImageViewer(true)}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setShowImageViewer(true); }}
                      className="media-action-btn" title="Open image">
                      <IoOpen size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(message.mediaUrl, "image.png"); }}
                      className="media-action-btn" title="Download image">
                      <IoDownload size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── File attachment card ── */}
              {!isSticker && (isFileMessage ? (
                <div>
                  <div className={`flex items-center gap-2.5 p-2.5 rounded-lg min-w-[220px] max-w-[280px] ${
                    isOwn ? "bg-white/15" : "bg-app-input"
                  }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isOwn ? "bg-white/20" : "bg-accent-light"
                    }`}>
                      <IoDocumentText size={20} className={isOwn ? "text-white" : "text-accent"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isOwn ? "text-white" : "text-app"}`}>
                        {displayFileName}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isOwn ? "text-white/50" : "text-app-tertiary"}`}>
                        {getFileTypeLabel(displayFileName)}
                      </p>
                    </div>
                  </div>
                  {/* Download button only */}
                  <div className="flex mt-1.5 min-w-[220px] max-w-[280px]">
                    <button
                      onClick={() => handleDownload(displayFileUrl, displayFileName)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors border-none ${
                        isOwn
                          ? "bg-white/15 hover:bg-white/25 text-white"
                          : "bg-app-input hover:bg-app-hover text-app"
                      }`}>
                      <IoDownload size={12} /> Download
                    </button>
                  </div>
                  {/* Caption description */}
                  {message.fileName && message.content && (
                    <p className={`mt-2 text-sm break-words whitespace-pre-wrap text-left ${isOwn ? "text-white/90" : "text-app-secondary"}`}>
                      {message.content}
                    </p>
                  )}
                  {/* Time + tick */}
                  <div className="flex items-center gap-2 justify-end mt-1.5">
                    <span className={`text-[11px] ${isOwn ? "text-white/55" : "text-app-tertiary"}`}>{timeStr}</span>
                    {renderStatus()}
                  </div>
                </div>
              ) : message.content ? (
                /* Text message */
                <div className="msg-content-row">
                  <span className="break-words whitespace-pre-wrap">{message.content}</span>
                  <span className="msg-time-inline">
                    {message.isEdited && <span className="italic mr-0.5">edited</span>}
                    {timeStr}
                    {renderStatus()}
                  </span>
                </div>
              ) : (
                /* Image-only time row */
                <div className="flex items-center gap-2 justify-end mt-1">
                  {message.isEdited && (
                    <span className={`text-[11px] italic ${isOwn ? "text-white/50" : "text-app-tertiary"}`}>edited</span>
                  )}
                  <span className={`text-[11px] ${isOwn ? "text-white/55" : "text-app-tertiary"}`}>{timeStr}</span>
                  {renderStatus()}
                </div>
              ))}
            </div>

            {/* Context menu / Unified Dropdown Options */}
            {showMenu && (
              <div ref={menuRef}
                className={`absolute z-20 bg-app rounded-xl shadow-app-lg border border-app-secondary min-w-[200px] ${isOwn ? "right-0" : "left-0"} top-0 -mt-1 animate-scale-in`}
                style={{ borderColor: "var(--border-primary)" }}>
                {showDeleteConfirm ? (
                  <div className="py-1.5">
                    <p className="px-3.5 py-1.5 text-xs text-app-tertiary font-medium">Delete message?</p>
                    <button onClick={handleDeleteForMe} className="ctx-menu-btn">
                      <IoPersonRemove size={14} className="text-orange-500" /> Delete for me
                    </button>
                    {isOwn && (
                      <button onClick={handleDeleteForEveryone} className="ctx-menu-btn text-red-500">
                        <IoPeople size={14} /> Delete for everyone
                      </button>
                    )}
                    <div className="mx-2 my-1 h-px bg-[var(--border-primary)]" />
                    <button onClick={() => setShowDeleteConfirm(false)} className="ctx-menu-btn text-app-tertiary">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Quick Emoji Reactions Bar */}
                    <div className="flex bg-app-input px-3 py-2 border-b border-app gap-1.5 items-center justify-between rounded-t-xl mb-1" style={{ borderColor: "var(--border-primary)" }}>
                      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { handleReact(emoji); setShowMenu(false); }}
                          className="hover:scale-125 transition-transform duration-100 cursor-pointer text-base p-0.5 border-none bg-transparent"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="py-1">
                      <button onClick={() => { setShowMenu(false); setReplyTo(message); }} className="ctx-menu-btn">
                        <IoArrowUndo size={14} className="text-accent" /> Reply message
                      </button>
                      <button onClick={handleCopy} className="ctx-menu-btn">
                        <IoCopy size={14} className="text-indigo-500" /> Copy message
                      </button>
                      <button onClick={handleForward} className="ctx-menu-btn">
                        <IoArrowForward size={14} className="text-green-500" /> Forward message
                      </button>
                      
                      {/* Edit restricted to OWN TEXT messages only */}
                      {isOwn && (!message.messageType || message.messageType === "text") && !message.mediaUrl && (
                        <button onClick={() => { setShowMenu(false); setEditingMessage(message); }} className="ctx-menu-btn">
                          <IoCreate size={14} className="text-amber-500" /> Edit message
                        </button>
                      )}
                      
                      <div className="mx-2 my-1 h-px bg-[var(--border-primary)]" />
                      <button onClick={() => setShowDeleteConfirm(true)} className="ctx-menu-btn text-red-500">
                        <IoTrash size={14} /> Delete message
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Own avatar (right side) */}
          {isOwn && (
            <div className="flex-shrink-0 mb-0.5 msg-avatar-container msg-avatar-right">
              <Avatar src={user?.profilePicture} name={user?.name} size="sm" className="msg-avatar" />
            </div>
          )}
        </div>

        {/* Reactions row */}
        {groupedReactions.length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap msg-reactions-wrapper ${isOwn ? "justify-end msg-reactions-own" : "justify-start msg-reactions-other"}`}>
            {groupedReactions.map((r, i) => {
              const userReacted = r.users.includes(user?.id);
              return (
                <button
                  key={i}
                  onClick={() => setShowReactionsModal(true)}
                  className="flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 shadow-app-sm border transition-all cursor-pointer hover:scale-105"
                  style={{
                    borderColor: userReacted ? "var(--accent)" : "var(--border-primary)",
                    background: userReacted ? "var(--accent-light)" : "var(--bg-primary)",
                    color: userReacted ? "var(--accent)" : "var(--text-secondary)"
                  }}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="font-semibold">{r.count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Image Viewer */}
      {showImageViewer && isImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={() => setShowImageViewer(false)}>
          <button onClick={() => setShowImageViewer(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors z-10" title="Close">
            <IoClose size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(message.mediaUrl, "image.png"); }}
            className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors z-10" title="Download">
            <IoDownload size={24} />
          </button>
          <img src={message.mediaUrl} alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Reactions Info Modal overlay */}
      {showReactionsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center animate-fade-in"
          onClick={() => setShowReactionsModal(false)}>
          <div className="bg-app rounded-2xl shadow-app-lg border border-app p-5 w-80 max-w-[90vw] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ borderColor: "var(--border-primary)" }}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-app mb-4" style={{ borderColor: "var(--border-primary)" }}>
              <h3 className="text-sm font-bold text-app">Message Reactions</h3>
              <button onClick={() => setShowReactionsModal(false)}
                className="p-1 rounded-full text-app-tertiary hover:bg-app-hover hover:text-app cursor-pointer border-none bg-transparent transition-colors">
                <IoClose size={18} />
              </button>
            </div>

            {/* Total Count */}
            <p className="text-xs text-app-tertiary mb-3">
              Total Reactions: <span className="font-semibold text-accent">{message.reactions?.length || 0}</span>
            </p>

            {/* Reactors List */}
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {message.reactions?.map((r, idx) => {
                const reactorId = r.user?._id || r.user;
                const isMe = reactorId === user?.id;
                const reactorName = r.user?.name || (isMe ? user?.name : "Unknown User");
                const reactorPicture = r.user?.profilePicture || (isMe ? user?.profilePicture : "");
                
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 animate-slide-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={reactorPicture} name={reactorName} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-app truncate">
                          {reactorName} {isMe && <span className="text-accent">(You)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{r.emoji}</span>
                      {isMe ? (
                        <button
                          onClick={async () => {
                            const oldReactions = message.reactions || [];
                            const userId = user?.id || user?._id;
                            const newReactions = oldReactions.filter(r => {
                              const rId = r.user?._id || r.user?.id || r.user;
                              return rId !== userId;
                            });
                            
                            // Optimistic update
                            updateMessage({ ...message, reactions: newReactions });
                            setShowReactionsModal(false);

                            try {
                              const res = await removeReaction(message._id);
                              updateMessage({ ...message, reactions: res.data });
                            } catch (err) {
                              console.log("Remove reaction error:", err);
                              // Rollback on failure
                              updateMessage({ ...message, reactions: oldReactions });
                            }
                          }}
                          className="text-[10px] font-semibold text-red-500 hover:underline cursor-pointer border-none bg-transparent p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Remove your reaction"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBubble;