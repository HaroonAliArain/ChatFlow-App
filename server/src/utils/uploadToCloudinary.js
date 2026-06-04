import getCloudinary from "../config/cloudinary.js";
import { createReadStream } from "streamifier";

/**
 * Determines the correct Cloudinary resource_type based on the file's MIME type.
 * 
 * Cloudinary's "auto" detection often misclassifies documents (PDF, DOCX, etc.)
 * as "image", causing broken URLs. We explicitly route:
 *   - image/*          → "image"
 *   - video/*          → "video"
 *   - everything else  → "raw"   (PDF, DOC, ZIP, TXT, etc.)
 */
const getResourceType = (mimetype) => {
  if (!mimetype) return "raw";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

const uploadToCloudinary = (fileBuffer, folder = "chat_app", mimetype = null) => {
  const cloudinary = getCloudinary();
  const resourceType = getResourceType(mimetype);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    createReadStream(fileBuffer).pipe(stream);
  });
};

export default uploadToCloudinary;
