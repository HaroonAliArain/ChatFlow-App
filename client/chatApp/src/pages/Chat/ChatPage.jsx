import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/sidebar/Sidebar";
import MessageList from "../../components/chat/MessageList";
import MessageInput from "../../components/chat/MessageInput";
import ChatHeader from "../../components/chat/ChatHeader";
import CreateGroupModal from "../../components/modals/CreateGroupModal";
import ForwardModal from "../../components/modals/ForwardModal";
import { useChatStore } from "../../store/chatStore";
import { IoChatbubbles, IoLockClosed, IoFlash } from "react-icons/io5";

const ChatPage = () => {
  const selectedChat = useChatStore((state) => state.selectedChat);
  const { setSelectedChat } = useChatStore();
  const conversations = useChatStore((state) => state.conversations);
  const loading = useChatStore((state) => state.loading);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const chatIdParam = searchParams.get("id");
  const prevChatIdParamRef = useRef(chatIdParam);

  // Use STATE (not ref) so that sync-done and selectedChat batch together in the same re-render,
  // preventing Effect 2 from seeing sync=done while selectedChat is still null.
  const [initialSyncDone, setInitialSyncDone] = useState(!searchParams.get("id"));

  // Effect 1: Sync from URL search params -> Zustand Store
  useEffect(() => {
    const currentChat = useChatStore.getState().selectedChat;
    const urlChanged = chatIdParam !== prevChatIdParamRef.current;
    const pendingInitialSync = chatIdParam && !currentChat && !initialSyncDone;

    if (urlChanged || pendingInitialSync) {
      if (chatIdParam) {
        if (currentChat?._id !== chatIdParam) {
          const targetChat = conversations.find((c) => c._id === chatIdParam);
          if (targetChat) {
            setSelectedChat(targetChat);
            // Both state updates batch together → applied in the same re-render
            setInitialSyncDone(true);
          } else if (!loading) {
            // Finished loading but chat not found (invalid/deleted ID)
            setInitialSyncDone(true);
          }
        } else {
          setInitialSyncDone(true);
        }
      } else {
        if (currentChat && prevChatIdParamRef.current) {
          setSelectedChat(null);
        }
        setInitialSyncDone(true);
      }
      prevChatIdParamRef.current = chatIdParam;
    }
  }, [chatIdParam, conversations, setSelectedChat, loading, initialSyncDone]);

  // Effect 2: Sync from Zustand Store -> URL search params (only after initial sync completes)
  useEffect(() => {
    if (loading) return;
    if (!initialSyncDone) return;

    const currentParam = searchParams.get("id");
    if (selectedChat?._id) {
      if (currentParam !== selectedChat._id) {
        setSearchParams({ id: selectedChat._id }, { replace: true });
      }
    } else {
      if (currentParam) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [selectedChat, searchParams, setSearchParams, loading, initialSyncDone]);

  const inChat = !!selectedChat || (!!chatIdParam && !initialSyncDone);

  return (
    <div className="flex h-screen bg-app-secondary transition-colors duration-300">
      {/* LEFT SIDEBAR */}
      <div className={`${inChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 md:flex-shrink-0`}>
        <Sidebar onNewGroup={() => setShowGroupModal(true)} />
      </div>

      {/* RIGHT CHAT AREA */}
      <div className={`flex-1 flex flex-col ${!inChat ? "hidden md:flex" : "flex"}`}>
        {selectedChat ? (
          <>
            <ChatHeader onBackClick={() => setSelectedChat(null)} />
            <MessageList />
            <MessageInput />
          </>
        ) : chatIdParam ? (
          /* Connecting loading state */
          <div className="flex-1 flex flex-col items-center justify-center bg-app-secondary transition-colors duration-300">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-app-tertiary">Connecting to conversation...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-app-secondary transition-colors duration-300">
            <div className="text-center animate-fade-in max-w-sm px-6">
              {/* Floating logo */}
              <div className="w-24 h-24 mx-auto mb-6 bg-accent-light rounded-full flex items-center justify-center shadow-app-md welcome-logo-float">
                <img src="/chatflow-logo.svg" alt="ChatFlow" className="w-12 h-12" />
              </div>

              <h3 className="text-xl font-bold text-app mb-2">Welcome to ChatFlow</h3>
              <p className="text-sm text-app-tertiary leading-relaxed">
                Select a conversation from the sidebar or start a new chat to begin messaging
              </p>

              {/* Feature highlights */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-app border border-app transition-colors">
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <IoChatbubbles size={14} className="text-accent" />
                  </div>
                  <p className="text-xs text-app-secondary text-left">Real-time messaging with instant delivery</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-app border border-app transition-colors">
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <IoLockClosed size={14} className="text-accent" />
                  </div>
                  <p className="text-xs text-app-secondary text-left">Secure private and group conversations</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-app border border-app transition-colors">
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <IoFlash size={14} className="text-accent" />
                  </div>
                  <p className="text-xs text-app-secondary text-left">Share images, emojis, and more</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateGroupModal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} />
      <ForwardModal />
    </div>
  );
};

export default ChatPage;