import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to validate updateProfile data
function validateUpdateProfile(data) {
    const errors = [];

    if (!data.name || data.name.trim() === "") {
        errors.push("Name cannot be empty");
    }

    if (data.bio && data.bio.length > 200) {
        errors.push("Bio must be less than 200 characters");
    }

    if (data.profilePicture) {
        try {
            new URL(data.profilePicture);
        } catch (err) {
            errors.push("Profile picture must be a valid URL");
        }
    }

    return errors;
}


const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            },
            token: token
        })

    } catch (error) {
        next(error);
    }
}

const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.EXPIRES_IN });

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.profilePicture,
                role: user.role,
            },
            token: token
        });
    } catch (error) {
        next(error);
    }
}

const getProfile = async (req, res, next) => {
    try {
        const id = req.user.id;
        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                picture: user.profilePicture,
                lastSeen: user.lastSeen,
            }
        })
    } catch (error) {
        next(error);
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const id = req.user.id;
        const { name, bio, profilePicture } = req.body;

        const errors = validateUpdateProfile(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.name = name || user.name;
        user.bio = bio || user.bio;
        user.profilePicture = profilePicture || user.profilePicture;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                picture: user.profilePicture,
            }
        });

    } catch (error) {
        next(error);
    }
}

const updatePassword = async (req, res, next) => {
    try {
        const id = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        next(error);
    }
}

const onlineStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { isOnline } = req.body;

        if (typeof isOnline !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isOnline must be true or false",
            });
        }

        const updateData = {
            isOnline,
        };

        if (!isOnline) {
            updateData.lastSeen = new Date();
        }

        const user = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Online status updated successfully",
            data: {
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
            },
        });
    } catch (error) {
        next(error);
    }
}

const requestOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Render the EJS email template
        const templatePath = path.join(__dirname, "../templates/otpEmail.ejs");
        const emailHtml = await ejs.renderFile(templatePath, {
            userName: user.name || "User",
            otp: otp,
        });

        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"ChatFlow" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "ChatFlow — Your Password Reset Code",
            html: emailHtml,
        });

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) 
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });

        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ 
                success: false,
                message: "OTP expired" 
            });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        const resetToken = jwt.sign(
            { email: user.email, purpose: "password_reset" },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "10m" }
        );

        res.status(200).json({ 
            success: true,
            message: "OTP verified successfully",
            resetToken
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        if (decoded.purpose !== "password_reset") {
            return res.status(400).json({
                success: false,
                message: "Invalid token purpose"
            });
        }

        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.isVerified = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        next(error);
    }
};

const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;
        const currentUserId = req.user.id;

        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }
            ]
        })
        .select("name email profilePicture isOnline lastSeen")
        .limit(20);

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};

export { registerUser, loginUser, getProfile, updateProfile, updatePassword, onlineStatus, requestOtp, verifyOtp, resetPassword, searchUsers };