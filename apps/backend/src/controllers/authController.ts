import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import nodemailer from "nodemailer";
import axios from "axios";
import { User } from "../models/User";
import { processDailyLoginBonus } from "../services/gamificationService";
import type { AuthRequest } from "../middleware/authMiddleware";
import { callGroqWithFallback } from "../services/groqService";

function generateToken(id: string): string {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_dev_key_12345";
  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
}

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      college,
      branch,
      degree,
      graduationYear,
      profilePicture,
    } = req.body;

    // 1. Validation
    if (!fullName || !email || !password) {
      res.status(400).json({
        message: "Full Name, Email, and Password are required",
      });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({
        message: "Passwords do not match",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    // 2. Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({
        message: "A user with this email address already exists",
      });
      return;
    }

    // 3. Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 5. Store user in MongoDB
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      college: college ? college.trim() : "",
      branch: branch ? branch.trim() : "",
      degree: degree ? degree.trim() : "",
      graduationYear: graduationYear ? graduationYear.trim() : "",
      profilePicture: profilePicture || "",
      isVerified: false,
      verificationToken,
      verificationTokenExpire,
    });

    // 6. Send verification email
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const verifyUrl = `${clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    console.log(`\n\n[GMAIL VERIFICATION LINK FOR ${user.email}]:\n${verifyUrl}\n\n`);

    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_EMAIL,
          to: user.email,
          subject: "Verify your Gmail address — PrepX Placement Platform",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
              <h2 style="color: #2563EB;">Welcome to PrepX!</h2>
              <p>Hi <strong>${user.fullName}</strong>,</p>
              <p>Thank you for signing up. Please click the button below to verify your Gmail address and activate your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Gmail Address</a>
              </div>
              <p style="color: #666; font-size: 12px;">This link will expire in 24 hours. If you did not create a PrepX account, please ignore this email.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("Failed to send verification email:", mailErr);
      }
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully! A verification link has been sent to your Gmail. Please verify your email before logging in.",
      verificationRequired: true,
      verificationLink: verifyUrl,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        isVerified: false,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: error.message || "Failed to create account",
    });
  }
}

/**
 * @route   POST /api/auth/verify-email-link
 * @desc    Verify Gmail account using verification link token
 * @access  Public
 */
export async function verifyEmailLink(req: Request, res: Response): Promise<void> {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      res.status(400).json({ message: "Verification token and email are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(400).json({ message: "No user found with this email address." });
      return;
    }

    if (user.isVerified) {
      res.json({
        success: true,
        message: "Your Gmail address is already verified! You can proceed to log in.",
      });
      return;
    }

    if (!user.verificationToken || user.verificationToken !== token) {
      res.status(400).json({ message: "Invalid verification link token." });
      return;
    }

    if (user.verificationTokenExpire && user.verificationTokenExpire < new Date()) {
      res.status(400).json({ message: "Verification link has expired. Please sign up again or request a new link." });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Your Gmail address has been verified successfully!",
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Email verification failed" });
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by email or username
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
    });
    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    // 2. Check if user password exists (handle OAuth accounts registered via Google/GitHub)
    if (!user.password) {
      const provider =
        user.authProvider && user.authProvider !== "local" ? user.authProvider : "Google";
      res.status(400).json({
        message: `This account was registered using ${provider}. Please sign in with ${provider} or use Forgot Password to create a password.`,
      });
      return;
    }

    // 3. Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      if (user.authProvider === "google") {
        res.status(401).json({
          message: "Incorrect password. This account was registered with Google. Sign in with 'Continue with Google' or click 'Forgot Password?' to set your password.",
          isGoogleAccount: true,
        });
        return;
      }
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    // 3. Check mandatory Gmail verification
    if (user.isVerified === false) {
      res.status(403).json({
        message: "Please verify your Gmail address before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
      });
      return;
    }

    // Generate JWT
    const token = generateToken(user._id.toString());

    // Award Daily Login Bonus (+50 XP) & update daily activity streak
    await processDailyLoginBonus(user);
    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        profilePicture: user.profilePicture,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        phoneNumber: user.phoneNumber,
        xp: user.xp || 0,
        streakDays: user.streakDays || 1,
        badges: user.badges || ["On Fire!"],
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      message: error.message || "Server error during login",
    });
  }
}

/**
 * @route   GET /api/auth/profile
 * @desc    Get currently logged-in user profile
 * @access  Private
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = req.user;
    await processDailyLoginBonus(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        college: user.college,
        branch: user.branch,
        degree: user.degree,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        profilePicture: user.profilePicture,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        phoneNumber: user.phoneNumber,
        xp: user.xp || 0,
        streakDays: user.streakDays || 1,
        badges: user.badges || ["On Fire!"],
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch profile",
    });
  }
}

/**
 * @route   GET /api/auth/leaderboard
 * @desc    Fetch top users from MongoDB database ordered by XP
 * @access  Public
 */
export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find({})
      .select("fullName username xp profilePicture")
      .sort({ xp: -1 })
      .limit(10)
      .lean();

    const leaderboard = users.map((u: any) => ({
      id: u._id.toString(),
      fullName: u.fullName || "Anonymous Candidate",
      username: u.username || "",
      xp: u.xp || 0,
      profilePicture: u.profilePicture || "",
    }));

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error: any) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch leaderboard" });
  }
}

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile information
 * @access  Private
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { username, fullName, college, branch, degree, graduationYear, cgpa, profilePicture, linkedinUrl, githubUrl, phoneNumber } = req.body;

    // Simple URL validation for LinkedIn and GitHub fields
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.[a-zA-Z]{2,}(\/\S*)?$/;
    if (linkedinUrl && !urlPattern.test(linkedinUrl)) {
      res.status(400).json({ message: "Invalid LinkedIn URL" });
      return;
    }
    if (githubUrl && !urlPattern.test(githubUrl)) {
      res.status(400).json({ message: "Invalid GitHub URL" });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (username !== undefined && username.trim() !== "") {
      const cleanUsername = username.trim().toLowerCase();
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        res.status(400).json({ message: "Username can only contain letters, numbers, underscores, dots, and hyphens" });
        return;
      }
      if (cleanUsername.length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters long" });
        return;
      }

      // Check if username is taken by another user
      const existingUser = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
      if (existingUser) {
        res.status(409).json({ message: "This username is already taken. Please choose another one." });
        return;
      }
      user.username = cleanUsername;
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (college !== undefined) user.college = college.trim();
    if (branch !== undefined) user.branch = branch.trim();
    if (degree !== undefined) user.degree = degree.trim();
    if (graduationYear !== undefined) user.graduationYear = graduationYear.trim();
    if (cgpa !== undefined) user.cgpa = cgpa.trim();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl.trim();
    if (githubUrl !== undefined) user.githubUrl = githubUrl.trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        college: updatedUser.college,
        branch: updatedUser.branch,
        degree: updatedUser.degree,
        graduationYear: updatedUser.graduationYear,
        cgpa: updatedUser.cgpa,
        profilePicture: updatedUser.profilePicture,
        linkedinUrl: updatedUser.linkedinUrl,
        githubUrl: updatedUser.githubUrl,
        phoneNumber: updatedUser.phoneNumber,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: error.message || "Failed to update profile",
    });
  }
}

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        message: "Current password and new password are required",
      });
      return;
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      res.status(400).json({
        message: "New passwords do not match",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.password) {
      res.status(400).json({
        message: `Your account uses ${user.authProvider || "social login"}. Please use Forgot Password to create a password.`,
      });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        message: "Current password is incorrect",
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    res.status(500).json({
      message: error.message || "Failed to change password",
    });
  }
}

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / clear token on client
 * @access  Public / Private
 */
export async function logout(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

/**
 * @route   POST /api/auth/google
 * @desc    Login/Signup via Google OAuth
 * @access  Public
 */
export async function googleLogin(req: Request, res: Response): Promise<void> {
  const { credential, clientId } = req.body;
  if (!credential) {
    res.status(400).json({ message: "No Google credential provided" });
    return;
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || clientId;
    const client = new OAuth2Client(googleClientId);

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: [
        googleClientId,
        "1042824120759-04prrgktoumo9aagnqr2602077u7j368.apps.googleusercontent.com",
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ message: "Invalid Google token payload" });
      return;
    }

    const { email, name, picture } = payload;
    if (!email) {
      res.status(400).json({ message: "No email found in Google token" });
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: name || "Google User",
        email: email,
        profilePicture: picture || "",
        authProvider: "google",
        isVerified: true,
      });
    } else {
      user.isVerified = true;
      if (!user.authProvider || user.authProvider === "local") {
        user.authProvider = "google";
        if (picture && !user.profilePicture) user.profilePicture = picture;
      }
      await user.save();
    }

    res.json({
      success: true,
      message: "Google login successful",
      token: generateToken(user._id.toString()),
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture || "",
      },
    });
  } catch (error: any) {
    console.error("Google auth error:", error?.message || error);
    res.status(500).json({ message: error?.message || "Google authentication failed" });
  }
}


/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) {
      // For security, don't reveal that the user doesn't exist
      res.json({ success: true, message: "If that email exists, a reset link was sent." });
      return;
    }

    // Create reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token to save in DB
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save();

    // Create reset URL (pointing to frontend)
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Log for dev purposes
    console.log(`\n\n[RESET PASSWORD LINK FOR ${user.email}]:\n${resetUrl}\n\n`);

    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563EB;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link is valid for 15 minutes.</p>
        `,
      });
    }

    res.json({
      success: true,
      message: "If that email exists, a reset link was sent.",
      // In dev mode, we can return the url directly for easy testing if desired
      dev_link: resetUrl
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending password reset email" });
  }
}

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    // Re-hash token from URL to match the one in DB
    const resetPasswordToken = crypto.createHash("sha256").update(token as string).digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired password reset token" });
      return;
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful! You can now log in.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
}

/**
 * @route   POST /api/auth/github
 * @desc    Login/Signup via GitHub OAuth
 * @access  Public
 */
export async function githubLogin(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ message: "No GitHub code provided" });
    return;
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID || "MOCK_GITHUB_CLIENT_ID";
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || "MOCK_GITHUB_CLIENT_SECRET";

    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      // For mock logic if no real keys
      if (clientId === "MOCK_GITHUB_CLIENT_ID") {
        const mockUser = await findOrCreateOAuthUser("github", "mock-github-123", "Mock GitHub User", "mock-github@example.com", "");
        res.json(getAuthResponse(mockUser, "GitHub login successful (MOCK)"));
        return;
      }
      res.status(400).json({ message: "Failed to get GitHub access token" });
      return;
    }

    // 2. Fetch user profile
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 3. Fetch user emails (GitHub doesn't always return email in primary profile if it's private)
    const emailResponse = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;
    const primaryEmailObj = emailResponse.data.find((e: any) => e.primary) || emailResponse.data[0];
    const email = primaryEmailObj?.email;

    if (!email) {
      res.status(400).json({ message: "No email associated with this GitHub account" });
      return;
    }

    const user = await findOrCreateOAuthUser(
      "github",
      githubUser.id.toString(),
      githubUser.name || githubUser.login,
      email,
      githubUser.avatar_url
    );

    res.json(getAuthResponse(user, "GitHub login successful"));
  } catch (error: any) {
    console.error("GitHub auth error:", error.response?.data || error);
    res.status(500).json({ message: "GitHub authentication failed" });
  }
}

/**
 * @route   POST /api/auth/linkedin
 * @desc    Login/Signup via LinkedIn OAuth
 * @access  Public
 */
export async function linkedinLogin(req: Request, res: Response): Promise<void> {
  const { code, redirectUri } = req.body;
  if (!code) {
    res.status(400).json({ message: "No LinkedIn code provided" });
    return;
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "MOCK_LINKEDIN_CLIENT_ID";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "MOCK_LINKEDIN_CLIENT_SECRET";

    // 1. Exchange code for access token
    let accessToken;
    if (clientId === "MOCK_LINKEDIN_CLIENT_ID") {
      const mockUser = await findOrCreateOAuthUser("linkedin", "mock-linkedin-123", "Mock LinkedIn User", "mock-linkedin@example.com", "");
      res.json(getAuthResponse(mockUser, "LinkedIn login successful (MOCK)"));
      return;
    }

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri || "http://localhost:5173/auth/callback",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      res.status(400).json({ message: "Failed to get LinkedIn access token" });
      return;
    }

    // 2. Fetch user profile (LinkedIn OIDC endpoint)
    const userResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const linkedinUser = userResponse.data;
    const email = linkedinUser.email;
    const name = linkedinUser.name;
    const picture = linkedinUser.picture;

    if (!email) {
      res.status(400).json({ message: "No email associated with this LinkedIn account" });
      return;
    }

    const user = await findOrCreateOAuthUser(
      "linkedin",
      linkedinUser.sub,
      name,
      email,
      picture
    );

    res.json(getAuthResponse(user, "LinkedIn login successful"));
  } catch (error: any) {
    console.error("LinkedIn auth error:", error.response?.data || error);
    res.status(500).json({ message: "LinkedIn authentication failed" });
  }
}

// Helper function to find or create OAuth users
async function findOrCreateOAuthUser(provider: string, providerId: string, name: string, email: string, picture: string) {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      fullName: name || `${provider} User`,
      email: email,
      profilePicture: picture || "",
      authProvider: provider,
      providerId: providerId,
      isVerified: true,
    });
  } else {
    user.isVerified = true;
    if (!user.authProvider || user.authProvider === "local") {
      user.authProvider = provider;
      user.providerId = providerId;
      if (picture && !user.profilePicture) user.profilePicture = picture;
    }
    await user.save();
  }
  return user;
}

// Helper function to format auth response
function getAuthResponse(user: any, message: string) {
  return {
    success: true,
    message,
    token: generateToken(user._id.toString()),
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      profilePicture: user.profilePicture || "",
    },
  };
}

/**
 * @route   POST /api/auth/send-email-otp
 * @desc    Generate and send 6-digit OTP code to email
 * @access  Public
 */
export async function sendEmailOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Create user record for new email OTP user
      user = await User.create({
        fullName: normalizedEmail.split("@")[0],
        email: normalizedEmail,
        emailOtpToken: hashedOtp,
        emailOtpExpire: otpExpire,
      });
    } else {
      user.emailOtpToken = hashedOtp;
      user.emailOtpExpire = otpExpire;
      await user.save();
    }

    console.log(`\n\n[EMAIL OTP FOR ${normalizedEmail}]: ${otp}\n\n`);

    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: normalizedEmail,
        subject: "Your prepX Login OTP Code",
        html: `
          <h2>prepX Email Login</h2>
          <p>Your one-time login OTP code is:</p>
          <h1 style="font-size:32px;letter-spacing:4px;color:#2563EB;">${otp}</h1>
          <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        `,
      });
    }

    res.json({
      success: true,
      message: `OTP sent successfully to ${normalizedEmail}`,
      dev_otp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error: any) {
    console.error("Send email OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to send email OTP" });
  }
}

/**
 * @route   POST /api/auth/verify-email-otp
 * @desc    Verify OTP code and authenticate user
 * @access  Public
 */
export async function verifyEmailOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP code are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      emailOtpToken: hashedOtp,
      emailOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired OTP code" });
      return;
    }

    // Clear OTP fields
    user.emailOtpToken = undefined;
    user.emailOtpExpire = undefined;
    await user.save();

    res.json(getAuthResponse(user, "Email OTP login successful"));
  } catch (error: any) {
    console.error("Verify email OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to verify OTP" });
  }
}

/**
 * @route   POST /api/auth/request-password-change-otp
 * @desc    Generate and send OTP for password change verification
 * @access  Public / Private
 */
export async function requestPasswordChangeOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailOtpToken = hashedOtp;
    user.emailOtpExpire = otpExpire;
    await user.save();

    console.log(`\n\n[PASSWORD CHANGE OTP FOR ${normalizedEmail}]: ${otp}\n\n`);

    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: normalizedEmail,
        subject: "Your prepX Password Change Verification Code",
        html: `
          <h2>prepX Password Verification</h2>
          <p>Your one-time verification code to change your password is:</p>
          <h1 style="font-size:32px;letter-spacing:4px;color:#2563EB;">${otp}</h1>
          <p>This code will expire in 10 minutes. If you did not request this, please secure your account immediately.</p>
        `,
      });
    }

    res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}`,
      dev_otp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error: any) {
    console.error("Request password change OTP error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send verification code" });
  }
}

/**
 * @route   POST /api/auth/verify-password-change-otp
 * @desc    Verify OTP code for password change
 * @access  Public / Private
 */
export async function verifyPasswordChangeOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, verified: false, message: "Email and verification code are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedOtp = crypto.createHash("sha256").update(code.trim()).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      emailOtpToken: hashedOtp,
      emailOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ success: false, verified: false, message: "Invalid or expired verification code" });
      return;
    }

    res.json({
      success: true,
      verified: true,
      message: "Verification code verified successfully",
    });
  } catch (error: any) {
    console.error("Verify password change OTP error:", error);
    res.status(500).json({ success: false, verified: false, message: error.message || "Failed to verify code" });
  }
}

/**
 * @route   GET /api/auth/search-colleges-db
 * @desc    Fast instant MongoDB database search for existing colleges
 * @access  Public
 */
export async function searchCollegesDb(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }

    const dbMatches = await User.distinct("college", {
      college: { $regex: query, $options: "i" },
    });

    const filteredDbResults = dbMatches.filter((c: string) => c && c.trim().length > 0).slice(0, 10);

    res.json({
      success: true,
      query,
      dbResults: filteredDbResults,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to search DB colleges" });
  }
}

/**
 * @route   GET /api/auth/search-colleges-ai
 * @desc    Groq AI powered recommendation search for colleges
 * @access  Public
 */
export async function searchCollegesAi(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }

    let aiSuggestions: string[] = [];

    try {
      const completion = await callGroqWithFallback((groq) =>
        groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic institution directory. Given a partial search query, return a json object with key "colleges" containing an array of up to 6 real world college or university names that start with or match the search query.`,
            },
            {
              role: "user",
              content: `Search query: "${query}"`,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" },
        })
      );

      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.colleges)) {
          aiSuggestions = parsed.colleges;
        }
      }
    } catch (aiErr) {
      console.warn("AI college search warning:", aiErr);
    }

    if (aiSuggestions.length === 0) {
      const popularColleges = [
        "Stanford University", "Massachusetts Institute of Technology (MIT)",
        "Harvard University", "University of California, Berkeley",
        "Indian Institute of Technology (IIT) Bombay", "Indian Institute of Technology (IIT) Delhi",
        "National Institute of Technology (NIT)", "Carnegie Mellon University",
        "University of Oxford", "University of Cambridge", "Georgia Institute of Technology"
      ];
      aiSuggestions = popularColleges.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }

    res.json({
      success: true,
      query,
      aiSuggestions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch AI college recommendations" });
  }
}

/**
 * @route   GET /api/auth/search-branches-db
 * @desc    Fast instant MongoDB database search for existing branches/departments
 * @access  Public
 */
export async function searchBranchesDb(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }

    const dbMatches = await User.distinct("branch", {
      branch: { $regex: query, $options: "i" },
    });

    const filteredDbResults = dbMatches.filter((b: string) => b && b.trim().length > 0).slice(0, 10);

    res.json({
      success: true,
      query,
      dbResults: filteredDbResults,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to search DB branches" });
  }
}

/**
 * @route   GET /api/auth/search-branches-ai
 * @desc    Groq AI powered recommendation search for branches/departments
 * @access  Public
 */
export async function searchBranchesAi(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }

    let aiSuggestions: string[] = [];

    try {
      const completion = await callGroqWithFallback((groq) =>
        groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic program directory. Given a partial search query, return a json object with key "branches" containing an array of up to 6 real world academic department/branch names (e.g. Computer Science, Electrical Engineering, Mechanical Engineering) that match or relate to the search query.`,
            },
            {
              role: "user",
              content: `Search query: "${query}"`,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" },
        })
      );

      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.branches)) {
          aiSuggestions = parsed.branches;
        }
      }
    } catch (aiErr) {
      console.warn("AI branch search warning:", aiErr);
    }

    if (aiSuggestions.length === 0) {
      const popularBranches = [
        "Computer Science and Engineering", "Information Technology",
        "Electronics and Communication Engineering", "Electrical Engineering",
        "Mechanical Engineering", "Civil Engineering", "Data Science & Artificial Intelligence",
        "Biotechnology", "Chemical Engineering", "Aerospace Engineering"
      ];
      aiSuggestions = popularBranches.filter((b) => b.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }

    res.json({
      success: true,
      query,
      aiSuggestions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch AI branch recommendations" });
  }
}

/**
 * @route   GET /api/auth/search-degrees-db
 * @desc    Fast instant MongoDB database search for existing degrees
 * @access  Public
 */
export async function searchDegreesDb(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, dbResults: [] });
      return;
    }

    const dbMatches = await User.distinct("degree", {
      degree: { $regex: query, $options: "i" },
    });

    const filteredDbResults = dbMatches.filter((d: string) => d && d.trim().length > 0).slice(0, 10);

    res.json({
      success: true,
      query,
      dbResults: filteredDbResults,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to search DB degrees" });
  }
}

/**
 * @route   GET /api/auth/search-degrees-ai
 * @desc    Groq AI powered recommendation search for degrees
 * @access  Public
 */
export async function searchDegreesAi(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      res.json({ success: true, aiSuggestions: [] });
      return;
    }

    let aiSuggestions: string[] = [];

    try {
      const completion = await callGroqWithFallback((groq) =>
        groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an academic degree directory. Given a partial search query, return a json object with key "degrees" containing an array of up to 6 standard academic degree names (e.g. B.Tech, B.S., M.Tech, M.S., Ph.D., B.E., MBA, BBA) that match or relate to the search query.`,
            },
            {
              role: "user",
              content: `Search query: "${query}"`,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          response_format: { type: "json_object" },
        })
      );

      const content = completion?.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.degrees)) {
          aiSuggestions = parsed.degrees;
        }
      }
    } catch (aiErr) {
      console.warn("AI degree search warning:", aiErr);
    }

    if (aiSuggestions.length === 0) {
      const popularDegrees = [
        "Bachelor of Technology (B.Tech)", "Bachelor of Science (B.S.)",
        "Bachelor of Engineering (B.E.)", "Master of Technology (M.Tech)",
        "Master of Science (M.S.)", "Master of Business Administration (MBA)",
        "Bachelor of Business Administration (BBA)", "Doctor of Philosophy (Ph.D.)"
      ];
      aiSuggestions = popularDegrees.filter((d) => d.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }

    res.json({
      success: true,
      query,
      aiSuggestions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch AI degree recommendations" });
  }
}

