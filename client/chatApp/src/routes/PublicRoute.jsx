import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const PublicRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

export default PublicRoute;