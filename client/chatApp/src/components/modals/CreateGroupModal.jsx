import { useState } from "react";
import { searchUsers } from "../../services/userService";
import { createGroupChat } from "../../services/conversationService";
import { useChatStore } from "../../store/chatStore";
import Avatar from "../common/Avatar";
import { IoClose, IoSearch } from "react-icons/io5";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const { addConversation, setSelectedChat } = useChatStore();

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await searchUsers(query);
      setSearchResults(data.users || []);
    } catch (err) { console.log("Search error", err); }
    finally { setSearching(false); }
  };

  const toggleMember = (user) => {
    const isSelected = selectedMembers.some((m) => m._id === user._id);
    if (isSelected) {
      setSelectedMembers((prev) => prev.filter((m) => m._id !== user._id));
    } else {
      setSelectedMembers((prev) => [...prev, user]);
    }
  };

  const handleCreate = async () => {
    setError("");
    if (!groupName.trim()) { setError("Group name is required"); return; }
    if (selectedMembers.length < 2) { setError("Select at least 2 members"); return; }

    setLoading(true);
    try {
      const data = await createGroupChat({
        groupName, groupDescription,
        participants: selectedMembers.map((m) => m._id),
      });
      addConversation(data.conversation);
      setSelectedChat(data.conversation);
      onClose();
      resetForm();
    } catch (err) {
      setError(err?.message || "Failed to create group");
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setGroupName(""); setGroupDescription(""); setSearchQuery("");
    setSearchResults([]); setSelectedMembers([]); setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-app border border-app rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col shadow-2xl animate-scale-in transition-colors duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <h2 className="text-lg font-bold text-app">Create Group</h2>
          <button onClick={() => { onClose(); resetForm(); }}
            className="p-1.5 hover:bg-app-hover rounded-full cursor-pointer transition-colors">
            <IoClose size={18} className="text-app-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="text-red-500 text-sm mb-4 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-app-secondary mb-1.5">Group Name</label>
            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all placeholder:text-app-tertiary" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-app-secondary mb-1.5">Description (optional)</label>
            <input type="text" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all placeholder:text-app-tertiary" />
          </div>

          {/* Selected chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {selectedMembers.map((m) => (
                <span key={m._id}
                  className="flex items-center gap-1 bg-accent-light text-accent text-xs px-2.5 py-1 rounded-full font-semibold">
                  {m.name}
                  <button onClick={() => toggleMember(m)} className="cursor-pointer hover:text-red-500 transition-colors ml-0.5">
                    <IoClose size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-tertiary" size={14} />
            <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users to add..."
              className="w-full pl-9 pr-3 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all placeholder:text-app-tertiary" />
          </div>

          {/* Results */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {searching ? (
              <p className="text-xs text-app-tertiary text-center py-3">Searching...</p>
            ) : (
              searchResults.map((user) => {
                const isSelected = selectedMembers.some((m) => m._id === user._id);
                return (
                  <div key={user._id} onClick={() => toggleMember(user)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected ? "bg-app-selected" : "hover:bg-app-hover"
                    }`}>
                    <Avatar src={user.profilePicture} name={user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-app truncate">{user.name}</p>
                      {/* Show user email only for search visibility */}
                      <p className="text-xs text-app-tertiary truncate">{user.email}</p>
                    </div>
                    {isSelected && <span className="text-accent text-sm font-bold">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-app">
          <button onClick={handleCreate} disabled={loading || !groupName.trim() || selectedMembers.length < 2}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "var(--accent)" }}>
            {loading ? "Creating..." : `Create Group (${selectedMembers.length} members)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
