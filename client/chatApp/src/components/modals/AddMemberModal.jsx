import { useState } from "react";
import { searchUsers } from "../../services/userService";
import { addGroupMember } from "../../services/conversationService";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import { IoClose, IoSearch } from "react-icons/io5";

const AddMemberModal = ({ isOpen, onClose, conversation, onMemberAdded }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState("");

  // Get existing member IDs
  const existingMemberIds = conversation?.participants?.map(
    (p) => p.user?._id || p.user
  ) || [];

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await searchUsers(query);
      // Filter out existing members
      const filtered = (data.users || []).filter(
        (u) => !existingMemberIds.includes(u._id)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.log("Search error", err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (userId) => {
    setError("");
    setAdding(userId);
    try {
      const data = await addGroupMember(conversation._id, userId);
      if (onMemberAdded) onMemberAdded(data.conversation);
      // Remove from search results
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <IoClose size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          {error && (
            <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>
          )}

          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {searching ? (
            <p className="text-xs text-gray-400 text-center py-4">Searching...</p>
          ) : searchResults.length === 0 && searchQuery ? (
            <p className="text-xs text-gray-400 text-center py-4">No users found</p>
          ) : (
            searchResults.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
              >
                <Avatar src={user.profilePicture} name={user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleAdd(user._id)}
                  loading={adding === user._id}
                  className="text-xs px-3 py-1"
                >
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
