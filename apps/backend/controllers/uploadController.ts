import type { Response } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import { User } from "../models/User";
import type { AuthRequest } from "../middleware/authMiddleware";

// Multer memory storage configuration (stores file in buffer)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/**
 * Upload avatar image to Cloudinary and update user profilePicture URL
 */
export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Please upload an image file" });
      return;
    }

    // Ensure Cloudinary is configured with environment variables or fallback values
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfq6px5xz",
      api_key: process.env.CLOUDINARY_API_KEY || "159987823528767",
      api_secret: process.env.CLOUDINARY_API_SECRET || "d3fH6B8S5c9zN7X1_P1k8V2wL4m",
    });

    // Convert buffer to base64 data URI string for Cloudinary upload
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    // Upload to Cloudinary under 'profile_avatars' folder
    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: "profile_avatars",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });


    const imageUrl = uploadResult.secure_url;

    // Update user profile in DB
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.profilePicture = imageUrl;
    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      url: imageUrl,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    res.status(500).json({
      message: error.message || "Failed to upload avatar to Cloudinary",
    });
  }
}
