import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import OTP from "../pages/Auth/OTP";
import ChatPage from "../pages/Chat/ChatPage";
import ProfilePage from "../pages/Profile/ProfilePage";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* 🔥 DEFAULT ROUTE */}
      <Route path="/" element={<Navigate to="/chat" />} />

      {/* 🔓 Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        path="/otp"
        element={
          <PublicRoute>
            <OTP />
          </PublicRoute>
        }
      />

      {/* 🔐 Protected Routes */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;