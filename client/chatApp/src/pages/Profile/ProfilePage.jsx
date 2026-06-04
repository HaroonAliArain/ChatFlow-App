import { useState, useEffect, useRef } from "react";
import { getProfile, updateProfile, updatePassword } from "../../services/authService";
import { uploadMedia } from "../../services/userService";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { useSocketStore } from "../../store/socketStore";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/common/Avatar";
import Toast from "../../components/common/Toast";
import { IoArrowBack, IoCamera, IoSunny, IoMoon } from "react-icons/io5";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { setUser, logout } = useAuthStore();
  const { theme, setTheme, notifications, setNotifications } = useThemeStore();
  const { disconnectSocket } = useSocketStore();

  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({ name: "", email: "", bio: "", picture: "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setProfileData({
          name: data.user.name || "", email: data.user.email || "",
          bio: data.user.bio || "",
          // Server returns "picture" — normalize to match our field
          picture: data.user.profilePicture || data.user.picture || "",
        });
      } catch (err) { console.log("Profile fetch error", err); }
    };
    fetchProfile();
  }, []);

  // Handle file selection for avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setToast({ type: "error", message: "Please select a valid image file (JPG, PNG, GIF, or WebP)" });
      return;
    }

    // Validate file size (5MB max for profile pictures)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: "error", message: "Image size must be less than 5MB" });
      return;
    }

    setUploading(true);
    try {
      // Upload to Cloudinary via existing media upload endpoint
      const result = await uploadMedia(file);
      const imageUrl = result.mediaUrl;

      // Update local state with the new picture URL
      setProfileData((prev) => ({ ...prev, picture: imageUrl }));

      // Auto-save the profile with the new picture
      const data = await updateProfile({
        name: profileData.name,
        bio: profileData.bio,
        profilePicture: imageUrl,
      });
      setUser(data.user);
      localStorage.setItem(`chatflow-user-update-${data.user._id}`, Date.now().toString());
      setToast({ type: "success", message: "Profile picture updated!" });
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Failed to upload image" });
    } finally {
      setUploading(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await updateProfile({ name: profileData.name, bio: profileData.bio, profilePicture: profileData.picture });
      setUser(data.user);
      localStorage.setItem(`chatflow-user-update-${data.user._id}`, Date.now().toString());
      setToast({ type: "success", message: "Profile updated successfully!" });
    } catch (err) { setToast({ type: "error", message: err?.message || "Update failed" }); }
    finally { setLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    if (passwordData.newPassword !== passwordData.confirmPassword) { setToast({ type: "error", message: "Passwords don't match" }); setPwLoading(false); return; }
    try {
      await updatePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setToast({ type: "success", message: "Password updated successfully!" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { setToast({ type: "error", message: err?.message || "Password update failed" }); }
    finally { setPwLoading(false); }
  };

  const Toggle = ({ active, onToggle }) => (
    <div onClick={onToggle} className={`toggle-switch ${active ? "active" : ""}`} />
  );

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  return (
    <>
    <div className="min-h-screen bg-app-secondary transition-colors duration-300">
      {/* Top Bar */}
      <div className="bg-app border-b border-app px-5 py-3 flex items-center gap-3 sticky top-0 z-10 transition-colors duration-300">
        <button onClick={() => navigate("/chat")} className="p-2 hover:bg-app-hover rounded-full cursor-pointer">
          <IoArrowBack size={18} className="text-app-secondary" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/chatflow-logo.svg" alt="ChatFlow" className="w-6 h-6" />
          <span className="text-base font-bold text-accent">ChatFlow</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Avatar Card */}
        <div className="bg-app rounded-2xl p-6 shadow-app-sm flex items-center gap-4 animate-fade-in transition-colors duration-300">
          <div className="relative">
            <Avatar src={profileData.picture} name={profileData.name} size="xl" />
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            {/* Camera button triggers file picker */}
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 text-white p-1.5 rounded-full shadow-sm cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {uploading ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <IoCamera size={12} />
              )}
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold text-app">{profileData.name || "Your Name"}</h2>
            <p
              onClick={handleAvatarClick}
              className={`text-sm text-accent cursor-pointer hover:underline ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {uploading ? "Uploading..." : "Change Avatar"}
            </p>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-app rounded-2xl p-5 shadow-app-sm animate-fade-in transition-colors duration-300">
          <h3 className="text-base font-semibold text-app mb-4">Account Information</h3>

          <form onSubmit={handleUpdateProfile}>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">Username</label>
              <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">Email</label>
              <input type="email" value={profileData.email} disabled
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app-tertiary cursor-not-allowed" />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">Status Message</label>
              <input type="text" value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Online and ready to chat!"
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: "var(--accent)" }}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-app rounded-2xl p-5 shadow-app-sm animate-fade-in transition-colors duration-300">
          <h3 className="text-base font-semibold text-app mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-app-secondary">Enable All Notifications</span>
              <Toggle active={notifications.enableAll} onToggle={() => setNotifications({ enableAll: !notifications.enableAll })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-app-secondary">New Message Alerts</span>
              <Toggle active={notifications.newMessages} onToggle={() => setNotifications({ newMessages: !notifications.newMessages })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-app-secondary">Notification Sounds</span>
              <Toggle active={notifications.sounds} onToggle={() => setNotifications({ sounds: !notifications.sounds })} />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-app rounded-2xl p-5 shadow-app-sm animate-fade-in transition-colors duration-300">
          <h3 className="text-base font-semibold text-app mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-app-secondary">Theme</span>
            <div className="flex items-center gap-3">
              <IoSunny size={16} className={theme === "light" ? "text-amber-500" : "text-app-tertiary"} />
              <Toggle active={theme === "dark"} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
              <IoMoon size={16} className={theme === "dark" ? "text-accent" : "text-app-tertiary"} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-app rounded-2xl p-5 shadow-app-sm animate-fade-in transition-colors duration-300">
          <h3 className="text-base font-semibold text-app mb-4">Security</h3>

          <form onSubmit={handleUpdatePassword}>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">Current Password</label>
              <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">New Password</label>
              <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-app-secondary mb-1">Confirm Password</label>
              <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={pwLoading}
                className="px-5 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
                style={{ background: "var(--accent)" }}>
                {pwLoading ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-3 bg-red-500 text-white rounded-2xl font-semibold text-sm hover:bg-red-600 transition-colors cursor-pointer">
          Log Out
        </button>
        <div className="h-4" />
      </div>
    </div>

    {/* Toast Notification */}
    <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
};

export default ProfilePage;
