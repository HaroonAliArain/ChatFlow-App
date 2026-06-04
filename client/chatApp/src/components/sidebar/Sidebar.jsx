import { useEffect, useState } from "react";
import { getConversations, createPrivateChat } from "../../services/conversationService";
import { searchUsers } from "../../services/userService";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useSocketStore } from "../../store/socketStore";
import ConversationItem from "./ConversationItem";
import Avatar from "../common/Avatar";
import { useNavigate } from "react-router-dom";
import {
  IoChatbubbles,
  IoPeople,
  IoCall,
  IoSettings,
  IoSearch,
  IoClose,
  IoDownload,
} from "react-icons/io5";

const Sidebar = ({ onNewGroup }) => {
  const {
    conversations,
    setConversations,
    setSelectedChat,
    addConversation,
    loading,
    setLoading,
  } = useChatStore();

  const { token, user } = useAuthStore();
  const { isConnected } = useSocketStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "direct" | "groups"
  const [activeNav, setActiveNav] = useState("chats"); // "chats" | "contacts" | "calls" | "settings"

  // Contacts view state
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const showInstallBanner = deferredPrompt && isOnline && isConnected;

  // Fetch conversations
  useEffect(() => {
    if (!token) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        const data = await getConversations();
        setConversations(data.conversations || []);
      } catch (err) {
        console.log("Error loading chats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [token]);

  // Load all contacts when switching to contacts tab
  useEffect(() => {
    if (activeNav === "contacts" && !contactsLoaded) {
      loadAllContacts();
    }
  }, [activeNav]);

  const loadAllContacts = async () => {
    setContactSearching(true);
    try {
      // Search with empty-ish query to get users (backend needs at least 1 char)
      const data = await searchUsers("a");
      setAllContacts(data.users || []);
      setContactsLoaded(true);
    } catch (err) {
      console.log("Load contacts error", err);
    } finally {
      setContactSearching(false);
    }
  };

  // Search contacts
  const handleContactSearch = async (query) => {
    setContactSearch(query);
    if (!query.trim()) {
      setContactResults([]);
      return;
    }
    setContactSearching(true);
    try {
      const data = await searchUsers(query);
      setContactResults(data.users || []);
    } catch (err) {
      console.log("Contact search error", err);
    } finally {
      setContactSearching(false);
    }
  };

  // Select a contact → create/get private chat → open it
  const handleSelectContact = async (contactUser) => {
    try {
      const data = await createPrivateChat(contactUser._id);
      const convo = data.conversation;

      // Add to conversations if not already there
      const exists = conversations.find((c) => c._id === convo._id);
      if (!exists) {
        addConversation(convo);
      }

      setSelectedChat(convo);
      setActiveNav("chats"); // Switch back to chats view
      setContactSearch("");
      setContactResults([]);
    } catch (err) {
      console.log("Create chat error", err);
    }
  };

  // Count unread conversations for badge
  const unreadConversationCount = conversations.filter(c => (c.unreadCount || 0) > 0).length;

  const filteredConversations = conversations.filter((chat) => {
    if (activeTab === "unread" && !(chat.unreadCount > 0)) return false;
    if (activeTab === "direct" && chat.isGroup) return false;
    if (activeTab === "groups" && !chat.isGroup) return false;
    // "all" shows everything
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (chat.isGroup) return chat.groupName?.toLowerCase().includes(q);
    return chat.participants?.some((p) => p.user?.name?.toLowerCase().includes(q));
  });

  // Displayed contacts
  const displayedContacts = contactSearch.trim()
    ? contactResults
    : allContacts;

  // Handle nav click
  const handleNavClick = (navId) => {
    setActiveNav(navId);
    if (navId === "settings") {
      navigate("/profile");
    }
  };

  return (
    <div className="w-full h-full bg-app border-r border-app flex flex-col transition-colors duration-300">

      {/* ══════ TOP: Logo ══════ */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-app">
        <div className="flex items-center gap-2">
          <img src="/chatflow-logo.svg" alt="ChatFlow" className="w-7 h-7 sm:w-9 sm:h-9" />
          <span className="text-base sm:text-xl font-bold text-accent">ChatFlow</span>
        </div>
      </div>

      {/* ══════ CONTENT AREA ══════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── CHATS VIEW ── */}
        {activeNav === "chats" && (
          <>
            {/* Search */}
            <div className="px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-tertiary" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-8 py-2 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-tertiary hover:text-app-secondary cursor-pointer">
                    <IoClose size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* All / Unread / DM / Group Tabs */}
            <div className="px-3 py-1">
              <div className="flex bg-app-input rounded-lg p-1 overflow-x-auto gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread", badge: unreadConversationCount },
                  { key: "direct", label: "Personal" },
                  { key: "groups", label: "Groups" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 min-w-[70px] py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 flex-shrink-0 sm:flex-shrink sm:min-w-0 whitespace-nowrap ${
                      activeTab === tab.key
                        ? "bg-app text-accent shadow-app-sm"
                        : "text-app-secondary hover:text-app"
                    }`}
                  >
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className="unread-tab-badge">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* New Group button */}
            {activeTab === "groups" && onNewGroup && (
              <div className="px-3 py-1">
                <button
                  onClick={onNewGroup}
                  className="w-full py-2 text-xs font-semibold text-accent bg-accent-light rounded-lg hover:opacity-80 transition-colors cursor-pointer"
                >
                  + Create New Group
                </button>
              </div>
            )}

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {loading ? (
                <div className="flex items-center justify-center h-20">
                  <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm text-app-tertiary">
                    {activeTab === "unread"
                      ? "All caught up! No unread messages."
                      : searchQuery
                      ? "No chats found"
                      : "No conversations yet"}
                  </p>
                  {activeTab === "unread" && (
                    <button
                      onClick={() => setActiveTab("all")}
                      className="mt-2 text-xs text-accent font-medium hover:underline cursor-pointer"
                    >
                      View all chats
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((chat) => (
                  <div key={chat._id} onClick={() => setSelectedChat(chat)}>
                    <ConversationItem chat={chat} />
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── CONTACTS VIEW ── */}
        {activeNav === "contacts" && (
          <>
            <div className="px-3 py-2">
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-tertiary" size={15} />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-8 py-2 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  autoFocus
                />
                {contactSearch && (
                  <button onClick={() => { setContactSearch(""); setContactResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-tertiary hover:text-app-secondary cursor-pointer">
                    <IoClose size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-1">
              <p className="text-xs text-app-tertiary font-medium px-1">
                {contactSearch ? "Search Results" : "All Contacts"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1">
              {contactSearching ? (
                <div className="flex items-center justify-center h-20">
                  <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : displayedContacts.length === 0 ? (
                <p className="text-center text-sm text-app-tertiary py-8">
                  {contactSearch ? "No contacts found" : "No contacts available"}
                </p>
              ) : (
                displayedContacts.map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => handleSelectContact(contact)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-app-hover transition-colors mb-0.5 animate-slide-in"
                  >
                    <Avatar
                      src={contact.profilePicture}
                      name={contact.name}
                      size="md"
                      isOnline={contact.isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-app truncate">{contact.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── CALLS VIEW ── */}
        {activeNav === "calls" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mb-4">
              <IoCall size={28} className="text-accent" />
            </div>
            <h3 className="text-base font-semibold text-app mb-1">Calls Coming Soon</h3>
            <p className="text-xs text-app-tertiary">
              Voice and video calling features are not available yet. Stay tuned for updates!
            </p>
          </div>
        )}

        {/* ── SETTINGS VIEW (redirects to profile) ── */}
        {activeNav === "settings" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mb-4">
              <IoSettings size={28} className="text-accent" />
            </div>
            <h3 className="text-base font-semibold text-app mb-1">Settings</h3>
            <p className="text-xs text-app-tertiary mb-4">
              Manage your profile and preferences
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
            >
              Open Settings
            </button>
          </div>
        )}
      </div>

      {/* ══════ BOTTOM: Nav Tabs + User Profile ══════ */}

      {showInstallBanner && (
        <div className="mx-3 mb-2 px-3 py-2 bg-accent-light border border-accent/20 rounded-xl flex items-center justify-between gap-2 animate-slide-in">
          <div className="flex items-center gap-2 min-w-0">
            <IoDownload className="text-accent flex-shrink-0" size={18} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent truncate">Install ChatFlow</p>
              <p className="text-[10px] text-app-tertiary truncate">Install app on your phone or PC</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1 text-[10px] font-bold bg-accent text-white rounded-md hover:bg-accent-hover transition-colors cursor-pointer flex-shrink-0"
            style={{ background: "var(--accent)" }}
          >
            Install
          </button>
        </div>
      )}

      {/* User Profile Bar */}
      <div className="px-3 py-2 border-t border-app">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-app-input">
          <div className="relative">
            <Avatar src={user?.profilePicture} name={user?.name} size="sm" />
            {/* Online/Offline dot */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[var(--bg-primary)] ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-app truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-app-tertiary">
              {isConnected ? "Connected" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs at Bottom */}
      <div className="px-2 py-2 border-t border-app">
        <div className="flex items-center justify-around">
          {[
            { id: "chats", icon: IoChatbubbles, label: "Chats" },
            { id: "contacts", icon: IoPeople, label: "Contacts" },
            { id: "calls", icon: IoCall, label: "Calls" },
            { id: "settings", icon: IoSettings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeNav === item.id
                  ? "text-accent"
                  : "text-app-tertiary hover:text-app-secondary"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;