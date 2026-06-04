import api from "./api";

// 🔍 Search users by name or email
export const searchUsers = async (query) => {
  const res = await api.get("/users/search", { params: { q: query } });
  return res.data;
};

// 📤 Upload media file to Cloudinary
export const uploadMedia = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return res.data;
};
