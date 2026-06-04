import { v2 as cloudinary } from "cloudinary";

// Configure lazily to ensure env vars are loaded
// (dotenv may not have run yet when this module is first imported)
let configured = false;

const getCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
  return cloudinary;
};

export default getCloudinary;