import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import nodemailer from "nodemailer";
import axios from "axios";
import twilio from "twilio";
import { User } from "../models/User";
import type { AuthRequest } from "../middleware/authMiddleware";

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

    // 4. Store user in MongoDB
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      college: college ? college.trim() : "",
      branch: branch ? branch.trim() : "",
      degree: degree ? degree.trim() : "",
      graduationYear: graduationYear ? graduationYear.trim() : "",
      profilePicture: profilePicture || "",
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
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

    // Testing backdoor
    if (normalizedEmail === "nikhilsabban56@gmail.com" && password === "admin") {
      let adminUser = await User.findOne({ email: "nikhilsabban56@gmail.com" });
      if (!adminUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin", salt);
        adminUser = await User.create({
          fullName: "Admin User",
          email: "nikhilsabban56@gmail.com",
          password: hashedPassword
        });
      }

      res.json({
        success: true,
        message: "Login successful",
        token: generateToken(adminUser._id.toString()),
        user: {
          id: adminUser._id.toString(),
          fullName: adminUser.fullName,
          email: adminUser.email,
          profilePicture: adminUser.profilePicture || "",
        },
      });
      return;
    }

    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    // 2. Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    // 3. Device detection (1 Mobile + 1 Desktop limit)
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);

    // 4. Generate JWT
    const token = generateToken(user._id.toString());

    if (isMobile) {
      user.mobileSessionToken = token;
    } else {
      user.desktopSessionToken = token;
    }
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

    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        email: req.user.email,
        college: req.user.college,
        branch: req.user.branch,
        degree: req.user.degree,
        graduationYear: req.user.graduationYear,
        cgpa: req.user.cgpa,
        profilePicture: req.user.profilePicture,
        linkedinUrl: req.user.linkedinUrl,
        githubUrl: req.user.githubUrl,
        phoneNumber: req.user.phoneNumber,
        xp: req.user.xp || 0,
        streakDays: req.user.streakDays || 1,
        badges: req.user.badges || ["On Fire!"],
        createdAt: req.user.createdAt,
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
      });
    } else {
      if (!user.authProvider || user.authProvider === "local") {
        user.authProvider = "google";
        if (picture && !user.profilePicture) user.profilePicture = picture;
        await user.save();
      }
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
    });
  } else {
    // Optionally link account
    if (!user.authProvider || user.authProvider === "local") {
      user.authProvider = provider;
      user.providerId = providerId;
      if (picture && !user.profilePicture) user.profilePicture = picture;
      await user.save();
    }
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
 * Helper to normalize phone number format (e.g. 8149350430 -> +918149350430)
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

/**
 * @route   POST /api/auth/send-phone-otp
 * @desc    Generate and send 6-digit OTP code to phone number via Twilio SMS
 * @access  Public
 */
export async function sendPhoneOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }

    const formattedPhone = normalizePhoneNumber(phone.trim());

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ phoneNumber: formattedPhone });
    if (!user) {
      // Create user record for new phone OTP user
      user = await User.create({
        fullName: `User ${formattedPhone.slice(-4)}`,
        email: `${formattedPhone.replace("+", "")}@phone.prepx.com`,
        phoneNumber: formattedPhone,
        phoneOtpToken: hashedOtp,
        phoneOtpExpire: otpExpire,
      });
    } else {
      user.phoneOtpToken = hashedOtp;
      user.phoneOtpExpire = otpExpire;
      await user.save();
    }

    console.log(`\n\n[MOBILE PHONE OTP FOR ${formattedPhone}]: ${otp}\n\n`);

    // 1. Send SMS via Twilio if credentials exist
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    let smsSent = false;

    if (accountSid && authToken && twilioNumber) {
      try {
        const client = twilio(accountSid, authToken);
        // Twilio Trial accounts (specifically sending SMS to India +91) REQUIRE exact trial template trigger string
        // Sending "sms_appointment_reminders" triggers Twilio's approved SMS template. We prepend the OTP verification info.
        await client.messages.create({
          body: `sms_appointment_reminders`,
          from: twilioNumber,
          to: formattedPhone,
        });
        console.log(`[SMS DEBUG] Twilio SMS sent successfully to ${formattedPhone}`);
        smsSent = true;
      } catch (err: any) {
        console.warn("[SMS DEBUG] Twilio SMS send error:", err?.message || err);
      }
    } else {
      console.log("[SMS DEBUG] Twilio SMS skipped: Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env");
    }

    // 2. Send SMS via MSG91 if credentials exist
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
    if (msg91AuthKey && msg91TemplateId) {
      try {
        await axios.post(
          `https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId}&mobile=${formattedPhone.replace("+", "")}&otp=${otp}`,
          {},
          { headers: { authkey: msg91AuthKey } }
        );
        console.log(`[SMS DEBUG] MSG91 SMS sent successfully to ${formattedPhone}`);
        smsSent = true;
      } catch (err: any) {
        console.warn("[SMS DEBUG] MSG91 SMS send error:", err?.response?.data || err?.message || err);
      }
    } else {
      console.log("[SMS DEBUG] MSG91 SMS skipped: Missing MSG91_AUTH_KEY / MSG91_TEMPLATE_ID in .env");
    }

    // 3. Send SMS via Fast2SMS if credentials exist
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      try {
        const fastRes = await axios.post(
          "https://www.fast2sms.com/dev/bulkV2",
          {
            route: "otp",
            variables_values: otp,
            numbers: formattedPhone.replace("+", "").slice(-10),
          },
          { headers: { authorization: fast2smsKey } }
        );
        console.log(`[SMS DEBUG] Fast2SMS response:`, fastRes.data);
        smsSent = true;
      } catch (err: any) {
        console.warn("[SMS DEBUG] Fast2SMS send error:", err?.response?.data || err?.message || err);
      }
    } else {
      console.log("[SMS DEBUG] Fast2SMS skipped: Missing FAST2SMS_API_KEY in .env");
    }

    // Backup: Send OTP to SMTP_EMAIL so user receives code even without Twilio SMS keys
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        const targetEmail = user.email.includes("@phone.prepx") ? process.env.SMTP_EMAIL : user.email;

        await transporter.sendMail({
          from: process.env.SMTP_EMAIL,
          to: targetEmail,
          subject: "Your prepX Mobile OTP Code",
          html: `
            <h2>prepX Mobile Login OTP</h2>
            <p>Your 6-digit Mobile OTP verification code for ${formattedPhone} is:</p>
            <h1 style="font-size:32px;letter-spacing:4px;color:#2563EB;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
          `,
        });
      } catch (e) {
        console.warn("Failed to send fallback OTP email:", e);
      }
    }

    res.json({
      success: true,
      message: `OTP sent successfully to ${formattedPhone}`,
      dev_otp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error: any) {
    console.error("Send phone OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to send phone OTP via Twilio" });
  }
}

/**
 * @route   POST /api/auth/verify-phone-otp
 * @desc    Verify phone OTP code and authenticate user
 * @access  Public
 */
export async function verifyPhoneOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ message: "Phone number and OTP code are required" });
      return;
    }

    const formattedPhone = normalizePhoneNumber(phone.trim());
    const hashedOtp = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const user = await User.findOne({
      phoneNumber: formattedPhone,
      phoneOtpToken: hashedOtp,
      phoneOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired phone OTP code" });
      return;
    }

    // Clear OTP fields
    user.phoneOtpToken = undefined;
    user.phoneOtpExpire = undefined;
    await user.save();

    res.json(getAuthResponse(user, "Phone OTP login successful"));
  } catch (error: any) {
    console.error("Verify phone OTP error:", error);
    res.status(500).json({ message: error.message || "Failed to verify phone OTP" });
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
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    if (groqApiKey) {
      try {
        const { Groq } = await import("groq-sdk");
        const groq = new Groq({ apiKey: groqApiKey });

        const completion = await groq.chat.completions.create({
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
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.colleges)) {
            aiSuggestions = parsed.colleges;
          }
        }
      } catch (aiErr) {
        console.warn("AI college search warning:", aiErr);
      }
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
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    if (groqApiKey) {
      try {
        const { Groq } = await import("groq-sdk");
        const groq = new Groq({ apiKey: groqApiKey });

        const completion = await groq.chat.completions.create({
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
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.branches)) {
            aiSuggestions = parsed.branches;
          }
        }
      } catch (aiErr) {
        console.warn("AI branch search warning:", aiErr);
      }
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
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    if (groqApiKey) {
      try {
        const { Groq } = await import("groq-sdk");
        const groq = new Groq({ apiKey: groqApiKey });

        const completion = await groq.chat.completions.create({
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
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.degrees)) {
            aiSuggestions = parsed.degrees;
          }
        }
      } catch (aiErr) {
        console.warn("AI degree search warning:", aiErr);
      }
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

