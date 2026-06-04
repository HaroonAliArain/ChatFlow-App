import { Router } from "express";
const router = Router();

import upload from "../config/multer.js";
import mediaController from "../controllers/mediaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

router.post("/upload", authMiddleware, upload.single("file"), mediaController.uploadMedia);   // Route for uploading media files
router.get("/download", mediaController.downloadMedia);   // Route for downloading media files proxying Cloudinary (public to allow direct browser navigation)
router.get("/view", mediaController.viewMedia);   // Route for viewing media files in browser

export default router;