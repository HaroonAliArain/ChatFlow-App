import { io } from "socket.io-client";

// Derive the Socket.IO server URL from the API URL env variable
// VITE_API_URL is like "https://chatflow-app-7u34.onrender.com/api" — strip "/api" to get the base
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = apiUrl.replace(/\/api\/?$/, "");

const socket = io(SOCKET_URL, {
  autoConnect: false, // IMPORTANT (we control login connection)
  withCredentials: true,
});

export default socket;