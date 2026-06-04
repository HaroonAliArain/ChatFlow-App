import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage, editMessage } from "../../services/messageService";
import { uploadMedia } from "../../services/userService";
import { useMessageStore } from "../../store/messageStore";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useSocketStore } from "../../store/socketStore";
import { TYPING_DEBOUNCE } from "../../utils/constants";
import EmojiPicker from "emoji-picker-react";
import { IoSend, IoHappy, IoImage, IoClose, IoDocumentAttach, IoAdd, IoSparkles, IoVideocam } from "react-icons/io5";
import Toast from "../common/Toast";

const STICKERS = [
  { id: "clown", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f921/512.webp", name: "Clown" },
  { id: "alien", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.webp", name: "Alien" },
  { id: "mindblown", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp", name: "Mind Blown" },
  { id: "hearts", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp", name: "Hearts" },
  { id: "cool", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp", name: "Cool" },
  { id: "thinking", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp", name: "Thinking" },
  { id: "joy", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp", name: "Joy" },
  { id: "eyes", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp", name: "Eyes" },
  { id: "fire", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp", name: "Fire" },
  { id: "poop", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a9/512.webp", name: "Poop" },
  { id: "party", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp", name: "Party" },
  { id: "vomit", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f92e/512.webp", name: "Vomit" }
];

const MessageInput = () => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // ── File/Image Preview State ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(""); // "image" | "video" | "file"
  const [previewUrl, setPreviewUrl] = useState("");
  const [toast, setToast] = useState(null);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const stickerRef = useRef(null);
  const attachRef = useRef(null);
  const prevChatIdRef = useRef(null);

  const { addMessage, updateMessage, replaceTempMessage, replyTo, clearReplyTo, editingMessage, clearEditingMessage } = useMessageStore();
  const selectedChat = useChatStore((state) => state.selectedChat);
  const setDraft = useChatStore((state) => state.setDraft);
  const { updateLastMessage } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const { emitTyping, emitStopTyping } = useSocketStore();

  // Pre-load static Noto Emoji stickers inside browser cache for buttery-smooth picker rendering
  useEffect(() => {
    STICKERS.forEach((st) => {
      const img = new Image();
      img.src = st.url;
    });
  }, []);

  useEffect(() => {
    if (editingMessage) { setText(editingMessage.content || ""); inputRef.current?.focus(); }
  }, [editingMessage]);

  useEffect(() => {
    const handleClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
      if (stickerRef.current && !stickerRef.current.contains(e.target)) setShowSticker(false);
      if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttachMenu(false);
    };
    if (showEmoji || showSticker || showAttachMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji, showSticker, showAttachMenu]);

  // Load draft when chat switches
  useEffect(() => {
    if (selectedChat?._id) {
      if (selectedChat._id !== prevChatIdRef.current) {
        prevChatIdRef.current = selectedChat._id;
        const draft = useChatStore.getState().drafts[selectedChat._id] || "";
        setText(draft);
      }
    } else {
      prevChatIdRef.current = null;
      setText("");
    }
  }, [selectedChat?._id]);

  // Clean up Object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleTyping = useCallback((currentText) => {
    if (!selectedChat?._id) return;
    if (!currentText?.trim()) {
      emitStopTyping(selectedChat._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }
    emitTyping(selectedChat._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(selectedChat._id), TYPING_DEBOUNCE);
  }, [selectedChat?._id, emitTyping, emitStopTyping]);

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileType(type);
    
    if (type === "image" || type === "video") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl("");
    }
    
    setShowAttachMenu(false);
    inputRef.current?.focus();
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setFileType("");
    setPreviewUrl("");
    setText("");
    if (selectedChat?._id) {
      setDraft(selectedChat._id, "");
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile || !selectedChat) return;

    setUploading(true);
    setUploadProgress(0);

    let currentPercent = 0;
    let targetPercent = 0;
    let uploadRes = null;
    let uploadError = null;

    // Start the upload in the background
    const uploadPromise = uploadMedia(selectedFile, (percent) => {
      targetPercent = percent;
    }).then(res => {
      uploadRes = res;
    }).catch(err => {
      uploadError = err;
    });

    // Run a step-by-step loop to increment progress from 0% to 100%
    const runProgress = async () => {
      while (currentPercent < 100) {
        if (uploadError) break;

        if (uploadRes) {
          targetPercent = 100;
        }

        if (currentPercent < targetPercent) {
          currentPercent += 1;
          setUploadProgress(currentPercent);
        } else if (currentPercent < 99 && !uploadRes) {
          // If transfer is slow, slowly crawl up
          currentPercent += 1;
          setUploadProgress(currentPercent);
          await new Promise(r => setTimeout(r, 120));
          continue;
        }

        // Delay to make increment steps visible and smooth
        await new Promise(r => setTimeout(r, 12));
      }
    };

    await runProgress();

    // Wait for the network promise to resolve if animation completed faster
    if (!uploadRes && !uploadError) {
      await uploadPromise;
    }

    if (uploadError || !uploadRes) {
      console.log("Upload & Send error", uploadError);
      setToast({ type: "error", message: "Failed to upload file. Please try again." });
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    try {
      const uploadedUrl = uploadRes.mediaUrl || uploadRes.url || uploadRes.secure_url;

      if (!uploadedUrl) {
        setToast({ type: "error", message: "Upload failed: no URL returned from server" });
        return;
      }

      let res;
      if (fileType === "image") {
        res = await sendMessage({
          conversationId: selectedChat._id,
          content: text.trim() || "", // Caption is the text input
          image: uploadedUrl,
        });
      } else if (fileType === "video") {
        res = await sendMessage({
          conversationId: selectedChat._id,
          content: text.trim() || "",
          video: uploadedUrl,
        });
      } else {
        res = await sendMessage({
          conversationId: selectedChat._id,
          content: text.trim() || selectedFile.name, // Caption or filename
          fileUrl: uploadedUrl,
          fileName: selectedFile.name,
        });
      }

      addMessage(res.data);
      updateLastMessage(selectedChat._id, res.data);
      
      // Reset preview state and text caption
      handleCancelPreview();
    } catch (err) {
      console.log("Send message error", err);
      setToast({ type: "error", message: err?.message || "Failed to send message. Please try again." });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = async () => {
    if (selectedFile) {
      handleUploadAndSend();
      return;
    }

    if (!text.trim() || !selectedChat) return;
    emitStopTyping(selectedChat._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (editingMessage) {
      try {
        const res = await editMessage(editingMessage._id, { content: text });
        updateMessage(res.data || { ...editingMessage, content: text, isEdited: true });
        clearEditingMessage(); 
        setText("");
        if (selectedChat?._id) {
          setDraft(selectedChat._id, "");
        }
      } catch (err) { console.log("Edit error", err); }
      return;
    }

    // ── Optimistic update: show message instantly ──
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: currentUser?.id, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
      conversation: selectedChat._id,
      content: text,
      messageType: "text",
      status: "sent",
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null,
    };

    addMessage(optimisticMessage);
    updateLastMessage(selectedChat._id, optimisticMessage);
    const savedText = text;
    const savedReplyTo = replyTo;
    setText("");
    if (selectedChat?._id) {
      setDraft(selectedChat._id, "");
    }
    clearReplyTo();

    // Send to server in background
    const messageData = {
      conversationId: selectedChat._id,
      content: savedText,
      ...(savedReplyTo && { replyTo: savedReplyTo._id })
    };

    try {
      const res = await sendMessage(messageData);
      replaceTempMessage(tempId, res.data);
      updateLastMessage(selectedChat._id, res.data);
    } catch (err) {
      console.log("Send error", err);
      useMessageStore.getState().removeMessage(tempId);
    }
  };

  const handleSendSticker = async (url) => {
    if (!selectedChat) return;
    setShowSticker(false);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: currentUser?.id, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
      conversation: selectedChat._id,
      content: "",
      mediaUrl: url,
      messageType: "sticker",
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    addMessage(optimisticMessage);
    updateLastMessage(selectedChat._id, optimisticMessage);

    try {
      const res = await sendMessage({
        conversationId: selectedChat._id,
        content: "",
        fileUrl: url,
        messageType: "sticker",
      });
      replaceTempMessage(tempId, res.data);
      updateLastMessage(selectedChat._id, res.data);
    } catch (err) {
      console.log("Send sticker error", err);
      useMessageStore.getState().removeMessage(tempId);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const onEmojiClick = (emojiObj) => {
    setText((prev) => prev + emojiObj.emoji);
    inputRef.current?.focus();
  };

  if (!selectedChat) return null;

  return (
    <div className="chat-input-bar relative transition-colors duration-300">
      {/* File/Image Preview Panel */}
      {selectedFile && (
        <div className="px-5 py-4 bg-app-secondary border-b border-app animate-fade-in flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {(fileType === "image" || fileType === "video") && previewUrl ? (
              fileType === "video" ? (
                <video src={previewUrl} className="w-14 h-14 rounded-lg object-cover border border-app-secondary shadow-app-sm flex-shrink-0" muted />
              ) : (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-14 h-14 rounded-lg object-cover border border-app-secondary shadow-app-sm flex-shrink-0"
                />
              )
            ) : (
              <div className="w-14 h-14 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0 border border-app-secondary">
                <IoDocumentAttach size={26} className="text-accent" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app truncate">{selectedFile.name}</p>
              <p className="text-xs text-app-tertiary mt-0.5">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to send
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCancelPreview}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-app border border-app border-app-secondary text-app-secondary hover:bg-app-hover cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAndSend}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {uploading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-app-secondary border-b border-app animate-fade-in">
          <div className="w-1 h-8 rounded-full" style={{ background: "var(--accent)" }} />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-semibold text-accent">Replying to {replyTo.senderId?.name || "message"}</p>
            <p className="text-app-secondary truncate">{replyTo.content}</p>
          </div>
          <button onClick={clearReplyTo} className="text-app-tertiary hover:text-app-secondary cursor-pointer p-1 rounded-full hover:bg-app-hover transition-colors"><IoClose size={16} /></button>
        </div>
      )}

      {/* Edit preview */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-app animate-fade-in" style={{ background: "var(--accent-light)" }}>
          <div className="w-1 h-8 bg-amber-500 rounded-full" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-semibold text-amber-600">Editing message</p>
            <p className="text-app-secondary truncate">{editingMessage.content}</p>
          </div>
          <button onClick={() => { clearEditingMessage(); setText(""); }} className="text-app-tertiary hover:text-app-secondary cursor-pointer p-1 rounded-full hover:bg-app-hover transition-colors"><IoClose size={16} /></button>
        </div>
      )}

      {/* Upload progress spinner */}
      {uploading && (
        <div className="px-5 py-2.5 bg-app-secondary border-b border-app animate-fade-in flex items-center justify-between">
          <span className="text-xs font-semibold text-app flex items-center gap-2">
            Uploading {fileType}...
          </span>
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="var(--bg-input)"
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="var(--accent)"
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 12}
                strokeDashoffset={2 * Math.PI * 12 * (1 - uploadProgress / 100)}
                className="transition-all duration-200"
              />
            </svg>
            <span className="absolute text-[8px] font-bold text-accent">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-full left-2 right-2 md:left-4 md:right-auto mb-2 z-30 animate-fade-in max-w-[calc(100vw-16px)] md:max-w-none w-auto md:w-[320px]">
          <div className="block md:hidden w-full">
            <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={320} searchDisabled skinTonesDisabled previewConfig={{ showPreview: false }} />
          </div>
          <div className="hidden md:block">
            <EmojiPicker onEmojiClick={onEmojiClick} width={320} height={380} searchDisabled skinTonesDisabled previewConfig={{ showPreview: false }} />
          </div>
        </div>
      )}

      {/* Sticker picker */}
      {showSticker && (
        <div ref={stickerRef} className="absolute bottom-full left-2 right-2 md:left-12 md:right-auto mb-2 z-30 animate-fade-in bg-app rounded-2xl shadow-app-lg border border-app p-4 w-auto md:w-72 max-w-[calc(100vw-16px)]" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-semibold text-app-secondary mb-3 px-1">Select a Sticker</p>
          <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
            {STICKERS.map((st) => (
              <button
                key={st.id}
                onClick={() => handleSendSticker(st.url)}
                className="p-1 rounded-xl hover:bg-app-hover cursor-pointer border-none bg-transparent hover:scale-110 transition-all flex items-center justify-center"
              >
                <img src={st.url} alt={st.name} className="w-12 h-12 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment popup menu */}
      {showAttachMenu && (
        <div ref={attachRef} className="absolute bottom-full left-2 sm:left-14 mb-2 z-30 animate-fade-in bg-app rounded-xl shadow-app-lg border border-app-secondary py-1.5 min-w-[170px]">
          {/* Emoji option — visible on all screens inside the plus menu */}
          <button onClick={() => { setShowEmoji(true); setShowAttachMenu(false); }}
            className="ctx-menu-btn">
            <IoHappy size={16} className="text-amber-500" /> Emoji
          </button>
          <button onClick={() => { imageInputRef.current?.click(); }}
            className="ctx-menu-btn">
            <IoImage size={16} className="text-green-500" /> Photo / Image
          </button>
          <button onClick={() => { fileInputRef.current?.click(); }}
            className="ctx-menu-btn">
            <IoDocumentAttach size={16} className="text-blue-500" /> Document / File
          </button>
          <button onClick={() => { videoInputRef.current?.click(); }}
            className="ctx-menu-btn">
            <IoVideocam size={16} className="text-purple-500" /> Video
          </button>
          <button onClick={() => { setShowSticker(true); setShowAttachMenu(false); }}
            className="ctx-menu-btn">
            <IoSparkles size={16} className="text-amber-500" /> Sticker
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "image")} className="hidden" />
      <input ref={fileInputRef} type="file" onChange={(e) => handleFileSelect(e, "file")} className="hidden" />
      <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleFileSelect(e, "video")} className="hidden" />

      {/* Input row */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-3">
        {/* LEFT SIDE: Emoji (hidden on mobile) + Attach */}
        <button onClick={() => { setShowEmoji(!showEmoji); setShowSticker(false); setShowAttachMenu(false); }}
          className={`chat-input-icon-btn hidden sm:flex ${showEmoji ? "text-accent bg-accent-light" : ""}`}
          title="Emoji" disabled={uploading}>
          <IoHappy size={20} />
        </button>

        <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false); setShowSticker(false); }}
          className={`chat-input-icon-btn ${showAttachMenu ? "text-accent bg-accent-light" : ""}`}
          title="Attach file" disabled={uploading}>
          <IoAdd size={20} className={showAttachMenu ? "rotate-45" : ""} style={{ transition: "transform 0.2s" }} />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <input ref={inputRef} value={text}
            onChange={(e) => {
              const val = e.target.value;
              setText(val);
              if (selectedChat?._id) {
                setDraft(selectedChat._id, val);
              }
              handleTyping(val);
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "Add a caption/description..." : "Type a message..."}
            disabled={uploading}
            className="chat-text-input"
          />
        </div>

        {/* Send button */}
        <button onClick={handleSend} disabled={(!text.trim() && !selectedFile) || uploading}
          className="chat-send-btn"
          title="Send message">
          <IoSend size={16} />
        </button>
      </div>

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default MessageInput;