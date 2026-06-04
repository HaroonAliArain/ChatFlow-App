import { useEffect } from "react";
import { useSocketStore } from "../store/socketStore";
import { useAuthStore } from "../store/authStore";

/**
 * useSocket — manages socket connection lifecycle.
 * Connect when authenticated, disconnect when not.
 * Use this in App.jsx
 */
const useSocket = () => {
  const { connectSocket, disconnectSocket } = useSocketStore();
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);
};

export default useSocket;
