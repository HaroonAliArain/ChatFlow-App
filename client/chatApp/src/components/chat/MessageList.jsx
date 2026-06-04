import { useEffect, useRef, useState } from "react";
import { getMessages } from "../../services/messageService";
import { useMessageStore } from "../../store/messageStore";
import { useChatStore } from "../../store/chatStore";
import { useSocketStore } from "../../store/socketStore";
import { useAuthStore } from "../../store/authStore";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { formatChatDate } from "../../utils/formatTime";
import { IoChatbubbles, IoArrowDown } from "react-icons/io5";

const MessageList = () => {
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { messages, setMessages, loading, setLoading } = useMessageStore();
  const { joinChat, leaveChat, emitMessageSeen, typingUsers } = useSocketStore();
  const { clearUnreadCount } = useChatStore();
  const user = useAuthStore((state) => state.user);
  
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevChatRef = useRef(null);
  const prevMessagesCount = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  useEffect(() => {
    if (!selectedChat?._id) return;
    if (prevChatRef.current && prevChatRef.current !== selectedChat._id) leaveChat(prevChatRef.current);
    joinChat(selectedChat._id);
    prevChatRef.current = selectedChat._id;
    emitMessageSeen(selectedChat._id);
    clearUnreadCount(selectedChat._id); // Clear unread badge when chat is opened

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const data = await getMessages(selectedChat._id);
        const msgs = data.data || [];
        setMessages(msgs.reverse ? msgs.reverse() : msgs);
      } catch (err) { console.log("Message load error", err); }
      finally { setLoading(false); }
    };
    fetchMessages();
    return () => { if (selectedChat?._id) leaveChat(selectedChat._id); };
  }, [selectedChat?._id]);

  // Handle scroll to toggle the "Scroll to Bottom" button visibility
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Show button if user scrolled up by more than 300px from the bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    setShowScrollBtn(!isNearBottom);
    if (isNearBottom) {
      setNewMessagesCount(0);
    }
  };

  // Reset badge count on active chat change
  useEffect(() => {
    setNewMessagesCount(0);
  }, [selectedChat?._id]);

  // Instant scroll on initial open / loading finished
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      prevMessagesCount.current = messages.length;
      setNewMessagesCount(0);
    }
  }, [loading, selectedChat?._id]);

  // Smooth scroll for new incoming/outgoing messages or update unread badge if scrolled up
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const lastMessage = messages[messages.length - 1];
      const lastSenderId = lastMessage?.senderId?._id || lastMessage?.senderId;
      const isIncoming = lastSenderId !== user?.id;

      if (showScrollBtn && isIncoming) {
        setNewMessagesCount((prev) => prev + 1);
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setNewMessagesCount(0);
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, showScrollBtn, user?.id]);

  useEffect(() => { if (selectedChat?._id && messages.length > 0) emitMessageSeen(selectedChat._id); }, [messages.length, selectedChat?._id]);

  const isTyping = typingUsers[selectedChat?._id];
  const getDateKey = (dateStr) => dateStr ? new Date(dateStr).toDateString() : "";

  // Empty state — no chat selected
  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-app-secondary transition-colors duration-300">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-5 bg-accent-light rounded-full flex items-center justify-center shadow-app-md">
            <img src="/chatflow-logo.svg" alt="ChatFlow" className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-app mb-1">Welcome to ChatFlow</h3>
          <p className="text-sm text-app-tertiary mt-1 max-w-xs leading-relaxed">
            Select a chat to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      <div ref={containerRef} onScroll={handleScroll} className="chat-messages-area flex-1 overflow-y-auto transition-colors duration-300">
        <div className="px-4 sm:px-6 py-4 min-h-full flex flex-col justify-end">
          {loading ? (
            <div className="flex items-center justify-center h-full py-20">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-xs text-app-tertiary">Loading messages...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mb-4">
                <IoChatbubbles className="text-accent" size={24} />
              </div>
              <p className="text-sm font-medium text-app-secondary">No messages yet</p>
              <p className="text-xs text-app-tertiary mt-1">Send a message to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSep = !prevMsg || getDateKey(msg.createdAt) !== getDateKey(prevMsg.createdAt);

              // Check if consecutive messages from same sender (for grouping)
              const prevSenderId = prevMsg?.senderId?._id || prevMsg?.senderId;
              const curSenderId = msg.senderId?._id || msg.senderId;
              const isSameSenderAsPrev = prevSenderId === curSenderId && !showDateSep;

              return (
                <div key={msg._id}>
                  {showDateSep && <div className="date-separator"><span>{formatChatDate(msg.createdAt)}</span></div>}
                  <div className={isSameSenderAsPrev ? "mt-0.5" : "mt-3"}>
                    <MessageBubble message={msg} />
                  </div>
                </div>
              );
            })
          )}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setNewMessagesCount(0);
          }}
          className="absolute bottom-6 right-6 p-2.5 rounded-full bg-app text-accent hover:bg-accent-light hover:text-accent shadow-app-lg border border-app transition-all hover:scale-110 flex items-center justify-center z-30 animate-fade-in"
          style={{
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            borderColor: "var(--border-primary)"
          }}
          title="Scroll to Bottom"
        >
          <IoArrowDown size={16} />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 shadow-md border border-white animate-scale-in">
              {newMessagesCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default MessageList;