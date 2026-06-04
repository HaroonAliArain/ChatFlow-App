import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import useSocket from "./hooks/useSocket";
import { useThemeStore } from "./store/themeStore";
import { useAuthStore } from "./store/authStore";
import { getProfile } from "./services/authService";

const App = () => {
  useSocket();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  // Hydrate theme on app load
  useEffect(() => {
    useThemeStore.getState().hydrateTheme();
  }, []);

  // Hydrate user data on app load (after page refresh)
  // Token persists in sessionStorage but user object is lost — fetch it
  useEffect(() => {
    if (token && !user) {
      getProfile()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          // Token is invalid/expired — force logout
          logout();
        });
    }
  }, [token, user]);

  // Sync profile details across multiple open tabs in real-time
  useEffect(() => {
    if (!user?._id) return;

    const handleStorageChange = (e) => {
      if (e.key === `chatflow-user-update-${user._id}`) {
        getProfile()
          .then((res) => {
            setUser(res.user);
          })
          .catch((err) => {
            console.log("Error syncing user profile:", err);
          });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?._id, setUser]);

  return <AppRoutes />;
};

export default App;