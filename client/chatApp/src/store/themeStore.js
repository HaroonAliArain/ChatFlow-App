import { create } from "zustand";

let _storageHandler = null;

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem("chatflow-theme") || "light",

  notifications: JSON.parse(localStorage.getItem("chatflow-notifications") || '{"enableAll":true,"newMessages":true,"sounds":true}'),

  // 🌗 Toggle theme
  setTheme: (theme) => {
    localStorage.setItem("chatflow-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });
  },

  // 🔔 Update notification preferences
  setNotifications: (updates) => {
    const current = get().notifications;
    const newNotifs = { ...current, ...updates };
    localStorage.setItem("chatflow-notifications", JSON.stringify(newNotifs));
    set({ notifications: newNotifs });
  },

  // 🔄 Hydrate theme on app load + start cross-tab sync
  hydrateTheme: () => {
    const theme = localStorage.getItem("chatflow-theme") || "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });

    // Set up cross-tab sync via storage event
    if (_storageHandler) {
      window.removeEventListener("storage", _storageHandler);
    }
    _storageHandler = (e) => {
      if (e.key === "chatflow-theme" && e.newValue) {
        document.documentElement.classList.toggle("dark", e.newValue === "dark");
        set({ theme: e.newValue });
      }
      if (e.key === "chatflow-notifications" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          set({ notifications: parsed });
        } catch {
          // ignore parse errors
        }
      }
    };
    window.addEventListener("storage", _storageHandler);
  },
}));
