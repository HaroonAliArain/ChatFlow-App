import { useAuthStore } from "../store/authStore";
import { useSocketStore } from "../store/socketStore";
import { loginUser, registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";

/**
 * useAuth — encapsulates auth operations
 */
const useAuth = () => {
  const { login, logout, user, token, isAuthenticated } = useAuthStore();
  const { disconnectSocket } = useSocketStore();
  const navigate = useNavigate();

  const handleLogin = async (formData) => {
    const res = await loginUser(formData);
    login(res.user, res.token);
    navigate("/chat");
    return res;
  };

  const handleRegister = async (formData) => {
    const res = await registerUser(formData);
    navigate("/login");
    return res;
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  return {
    user,
    token,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
};

export default useAuth;
