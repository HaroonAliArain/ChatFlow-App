import { create } from "zustand";

/**
 * Normalize user data from API responses.
 * The server returns "picture" but the frontend uses "profilePicture".
 */
const normalizeUser = (userData) => {
  if (!userData) return null;
  return {
    ...userData,
    profilePicture: userData.profilePicture || userData.picture || null,
  };
};

export const useAuthStore = create((set) => ({
  user: null,
  token: sessionStorage.getItem("token") || null,
  isAuthenticated: !!sessionStorage.getItem("token"),
  loading: false,

  // 🔐 LOGIN
  login: (userData, token) => {
    sessionStorage.setItem("token", token);

    set({
      user: normalizeUser(userData),
      token,
      isAuthenticated: true,
    });
  },

  // 🚪 LOGOUT
  logout: () => {
    sessionStorage.removeItem("token");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  // 👤 SET USER (normalized)
  setUser: (user) => {
    set({
      user: normalizeUser(user),
      isAuthenticated: true,
    });
  },

  // ⏳ LOADING STATE
  setLoading: (value) => set({ loading: value }),

  // 🔄 HYDRATE AUTH
  hydrateAuth: () => {
    const token = sessionStorage.getItem("token");

    if (token) {
      set({
        token,
        isAuthenticated: true,
      });
    } else {
      set({
        token: null,
        isAuthenticated: false,
        user: null,
      });
    }
  },
}));