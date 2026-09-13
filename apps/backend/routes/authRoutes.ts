import { Router } from "express";
import {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
  githubLogin,
  linkedinLogin,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  searchCollegesDb,
  searchCollegesAi,
  searchBranchesDb,
  searchBranchesAi,
  searchDegreesDb,
  searchDegreesAi,
  getLeaderboard,
} from "../controllers/authController";
import { upload, uploadAvatar } from "../controllers/uploadController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/leaderboard", getLeaderboard as any);
router.get("/search-colleges-db", searchCollegesDb as any);
router.get("/search-colleges-ai", searchCollegesAi as any);
router.get("/search-branches-db", searchBranchesDb as any);
router.get("/search-branches-ai", searchBranchesAi as any);
router.get("/search-degrees-db", searchDegreesDb as any);
router.get("/search-degrees-ai", searchDegreesAi as any);
router.get("/profile", protect as any, getProfile as any);
router.put("/profile", protect as any, updateProfile as any);
router.post("/upload-avatar", protect as any, upload.single("avatar") as any, uploadAvatar as any);
router.put("/change-password", protect as any, changePassword as any);

router.post("/logout", logout);
router.post("/google", googleLogin as any);
router.post("/forgot-password", forgotPassword as any);
router.put("/reset-password/:token", resetPassword as any);
router.post("/github", githubLogin as any);
router.post("/linkedin", linkedinLogin as any);
router.post("/send-email-otp", sendEmailOtp as any);
router.post("/verify-email-otp", verifyEmailOtp as any);
router.post("/send-phone-otp", sendPhoneOtp as any);
router.post("/verify-phone-otp", verifyPhoneOtp as any);

export default router;
