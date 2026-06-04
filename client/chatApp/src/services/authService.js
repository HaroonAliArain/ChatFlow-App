import api from "./api";

// 🔐 Login
export const loginUser = async (data) => {
  const response = await api.post("/users/login", data);
  return response.data;
};

// 📝 Register
export const registerUser = async (data) => {
  const response = await api.post("/users/register", data);
  return response.data;
};

// 📩 OTP Request
export const requestOTP = async (email) => {
  const response = await api.post("/users/requestOtp", { email });
  return response.data;
};

// ✅ Verify OTP
export const verifyOTP = async (data) => {
  const response = await api.post("/users/verifyOtp", data);
  return response.data;
};

// 👤 Get Profile
export const getProfile = async () => {
  const response = await api.get("/users/profile");
  return response.data;
};

// ✏️ Update Profile
export const updateProfile = async (data) => {
  const response = await api.put("/users/updateProfile", data);
  return response.data;
};

// 🔒 Update Password
export const updatePassword = async (data) => {
  const response = await api.put("/users/updatePassword", data);
  return response.data;
};

// 🔄 Reset Password
export const resetPassword = async (data) => {
  const response = await api.post("/users/resetPassword", data);
  return response.data;
};