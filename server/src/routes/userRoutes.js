import express from "express";
import { registerUser, loginUser, getProfile, updateProfile, updatePassword, onlineStatus, requestOtp, verifyOtp, resetPassword, searchUsers } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);    // Route to search users by name or email
router.get("/profile", authMiddleware, getProfile);   // Route to get user profile, protected by authentication middleware
router.post("/register", registerUser);     // Route for user registration
router.post("/login", loginUser);   // Route for user login
router.put("/updateProfile", authMiddleware, updateProfile);    // Route to update user profile, protected by authentication middleware
router.put("/updatePassword", authMiddleware, updatePassword);  // Route to update user password, protected by authentication middleware
router.put("/onlineStatus", authMiddleware, onlineStatus);    // Route to update user online status, protected by authentication middleware
router.post("/requestOtp", requestOtp);    // Route to request OTP for password reset or verification
router.post("/verifyOtp", verifyOtp);      // Route to verify OTP for password reset or verification
router.post("/resetPassword", resetPassword);  // Route to reset password with valid token

export default router;