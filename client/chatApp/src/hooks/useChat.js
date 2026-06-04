import { useChatStore } from "../store/chatStore";
import { useMessageStore } from "../store/messageStore";
import { useSocketStore } from "../store/socketStore";
import { getMessages } from "../services/messageService";

/**
 * useChat — encapsulates chat operations
 */
const useChat = () => {
  const { selectedChat, setSelectedChat, conversations } = useChatStore();
  const { setMessages, setLoading } = useMessageStore();
  const { joinChat, leaveChat, emitMessageSeen } = useSocketStore();

  // Select a chat and join the socket room
  const selectChat = async (chat) => {
    // Leave previous room
    if (selectedChat?._id) {
      leaveChat(selectedChat._id);
    }

    setSelectedChat(chat);

    if (!chat?._id) return;

    // Join new room
    joinChat(chat._id);

    // Fetch messages
    setLoading(true);
    try {
      const data = await getMessages(chat._id);
      const msgs = data.data || [];
      setMessages(msgs.reverse ? msgs.reverse() : msgs);
      emitMessageSeen(chat._id);
    } catch (err) {
      console.log("Error loading messages", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedChat,
    conversations,
    selectChat,
  };
};

export default useChat;
