import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { fetchMyInterviews, type InterviewRecord } from "../services/interviewService";
import { toast } from "react-toastify";
import { getErrorMessage } from "../lib/utils";
import {
  User,
  Mail,
  GraduationCap,
  Building,
  BookOpen,
  Calendar,
  Lock,
  Save,
  LogOut,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Award,
  Phone,
  Linkedin,
  Github,
  Search,
  ChevronRight,
  Camera,
  Upload,
  Sparkles,
} from "lucide-react";

import { SkeletonProfile } from "../components/ui/skeleton";
import { GLOBAL_COLLEGES } from "../constants/colleges";
import { uploadAvatar } from "../services/authService";
import { api } from "../services/api";

export function Profile() {
  const { user, updateUser, changePassword, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshProfile().catch((err) => console.warn("Failed to fetch fresh profile data:", err));
  }, []);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      if (res.success && res.url) {
        toast.success("Profile updated successfully!");
        setProfileForm((prev) => ({ ...prev, profilePicture: res.url }));
        await updateUser({ profilePicture: res.url });
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to update profile photo right now. Please try again."));
    } finally {
      setUploadingAvatar(false);
    }
  };


  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    college: user?.college || "",
    branch: user?.branch || "",
    degree: user?.degree || "",
    graduationYear: user?.graduationYear || "",
    cgpa: user?.cgpa || "",
    profilePicture: user?.profilePicture || "",
    linkedinUrl: user?.linkedinUrl || "",
    githubUrl: user?.githubUrl || "",
    phoneNumber: user?.phoneNumber || "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || "",
        fullName: user.fullName || "",
        college: user.college || "",
        branch: user.branch || "",
        degree: user.degree || "",
        graduationYear: user.graduationYear ? String(user.graduationYear) : "",
        cgpa: user.cgpa ? String(user.cgpa) : "",
        profilePicture: user.profilePicture || "",
        linkedinUrl: user.linkedinUrl || "",
        githubUrl: user.githubUrl || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // College & University Auto-Search State (DB + AI) for Edit Profile
  const [collegeDbResults, setCollegeDbResults] = useState<string[]>([]);
  const [collegeAiSuggestions, setCollegeAiSuggestions] = useState<string[]>([]);
  const [searchingCollege, setSearchingCollege] = useState(false);
  const debounceTimerRef = React.useRef<any>(null);

  const handleCollegeInputChange = (val: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val.trim()) {
      setCollegeDbResults([]);
      setCollegeAiSuggestions([]);
      setShowCollegeDropdown(false);
      return;
    }

    setShowCollegeDropdown(true);

    debounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      setSearchingCollege(true);

      // Stage 1: Fast Database Search (<50ms)
      try {
        const dbRes = await api.get(`/api/auth/search-colleges-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setCollegeDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("College DB search error in profile:", err);
      }

      // Stage 2: Silent AI Recommendation Search in Background
      try {
        const aiRes = await api.get(`/api/auth/search-colleges-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setCollegeAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("College AI search error in profile:", err);
      } finally {
        setSearchingCollege(false);
      }
    }, 200);
  };

  const selectCollege = (collegeName: string) => {
    setProfileForm((prev) => ({ ...prev, college: collegeName }));
    setShowCollegeDropdown(false);
  };

  // Branch Auto-Search State (DB + AI) for Edit Profile
  const [branchDbResults, setBranchDbResults] = useState<string[]>([]);
  const [branchAiSuggestions, setBranchAiSuggestions] = useState<string[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const branchDebounceTimerRef = React.useRef<any>(null);

  const handleBranchInputChange = (val: string) => {
    if (branchDebounceTimerRef.current) clearTimeout(branchDebounceTimerRef.current);
    if (!val.trim()) {
      setBranchDbResults([]);
      setBranchAiSuggestions([]);
      setShowBranchDropdown(false);
      return;
    }

    setShowBranchDropdown(true);

    branchDebounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      try {
        const dbRes = await api.get(`/api/auth/search-branches-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setBranchDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("Branch DB search error in profile:", err);
      }

      try {
        const aiRes = await api.get(`/api/auth/search-branches-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setBranchAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("Branch AI search error in profile:", err);
      }
    }, 200);
  };

  const selectBranch = (branchName: string) => {
    setProfileForm((prev) => ({ ...prev, branch: branchName }));
    setShowBranchDropdown(false);
  };

  // Degree Auto-Search State (DB + AI) for Edit Profile
  const [degreeDbResults, setDegreeDbResults] = useState<string[]>([]);
  const [degreeAiSuggestions, setDegreeAiSuggestions] = useState<string[]>([]);
  const [showDegreeDropdown, setShowDegreeDropdown] = useState(false);
  const degreeDebounceTimerRef = React.useRef<any>(null);

  const handleDegreeInputChange = (val: string) => {
    if (degreeDebounceTimerRef.current) clearTimeout(degreeDebounceTimerRef.current);
    if (!val.trim()) {
      setDegreeDbResults([]);
      setDegreeAiSuggestions([]);
      setShowDegreeDropdown(false);
      return;
    }

    setShowDegreeDropdown(true);

    degreeDebounceTimerRef.current = setTimeout(async () => {
      const query = val.trim();
      try {
        const dbRes = await api.get(`/api/auth/search-degrees-db?q=${encodeURIComponent(query)}`);
        if (dbRes.data?.success) {
          setDegreeDbResults(dbRes.data.dbResults || []);
        }
      } catch (err) {
        console.warn("Degree DB search error in profile:", err);
      }

      try {
        const aiRes = await api.get(`/api/auth/search-degrees-ai?q=${encodeURIComponent(query)}`);
        if (aiRes.data?.success) {
          setDegreeAiSuggestions(aiRes.data.aiSuggestions || []);
        }
      } catch (err) {
        console.warn("Degree AI search error in profile:", err);
      }
    }, 200);
  };

  const selectDegree = (degreeName: string) => {
    setProfileForm((prev) => ({ ...prev, degree: degreeName }));
    setShowDegreeDropdown(false);
  };

  // OTP flow state
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Send verification code
  const handleSendCode = async () => {
    try {
      const res = await api.post("/api/auth/request-password-change-otp", { email: user?.email });
      if (res.data?.success) {
        toast.success("Verification code sent to your email.");
        setCodeSent(true);
      } else {
        toast.error(getErrorMessage(res.data?.message, "Unable to send verification code. Please try again."));
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to send verification code right now. Please try again."));
    }
  };

  // Verify the entered code
  const handleVerifyCode = async () => {
    try {
      const res = await api.post("/api/auth/verify-password-change-otp", {
        email: user?.email,
        code: verificationCode,
      });
      if (res.data?.success && res.data?.verified) {
        toast.success("Code verified successfully.");
        setCodeVerified(true);
      } else {
        toast.error(getErrorMessage(res.data?.message, "The verification code is incorrect or expired."));
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Unable to verify code right now. Please try again."));
    }
  };

  // Sync profile form when user context updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || "",
        fullName: user.fullName || "",
        college: user.college || "",
        branch: user.branch || "",
        degree: user.degree || "",
        graduationYear: user.graduationYear || "",
        cgpa: user.cgpa || "",
        profilePicture: user.profilePicture || "",
        linkedinUrl: user.linkedinUrl || "",
        githubUrl: user.githubUrl || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }
    const urlPattern = /^(https?:\/\/)?([\w.-]+)\.[a-zA-Z]{2,}(\/\S*)?$/;
    if (profileForm.linkedinUrl && !urlPattern.test(profileForm.linkedinUrl)) {
      toast.error("Please enter a valid LinkedIn URL.");
      return;
    }
    if (profileForm.githubUrl && !urlPattern.test(profileForm.githubUrl)) {
      toast.error("Please enter a valid GitHub URL.");
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateUser(profileForm);
      toast.success("Profile updated.");
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't update profile. Please try again."));
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Enter your current and new password.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("New passwords don't match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });
      toast.success("Password changed.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Couldn't change password. Please try again."));
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Signed out.");
    navigate("/");
  }

  if (!user) {
    return <SkeletonProfile />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 sm:pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User Profile</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage your account settings, academic background, and interview history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 sm:flex-initial gap-2 border-border/80 hover:bg-card text-xs justify-center"
          >
            <History className="size-3.5" />
            Start New Interview
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="flex-1 sm:flex-initial gap-2 text-xs justify-center"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Profile Card & Password */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-md backdrop-blur">
            <div className="flex flex-col items-center text-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/*"
                  className="hidden"
                />
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    className="size-24 rounded-full object-cover border-2 border-violet-500/40 shadow-md group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-3xl font-bold text-white shadow-md shadow-violet-500/20 group-hover:opacity-80 transition-opacity">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  {uploadingAvatar ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <Camera className="size-6 text-white" />
                  )}
                </div>

                <div className="absolute bottom-0 right-0 p-1.5 bg-violet-600 rounded-full text-white shadow-md border border-background">
                  {uploadingAvatar ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Click photo to upload avatar via Cloudinary</p>

              <h2 className="mt-4 text-xl font-bold text-foreground">{user.fullName}</h2>
              {user.username ? (
                <p className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-md mt-1 border border-violet-500/20">
                  @{user.username}
                </p>
              ) : (
                <p className="text-xs text-amber-400/80 bg-amber-500/10 px-2.5 py-0.5 rounded-md mt-1 border border-amber-500/20">
                  Set your unique username below
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <Mail className="size-3.5" />
                {user.email}
              </p>

              {user.degree && user.college && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 border border-violet-500/20">
                  <GraduationCap className="size-3.5" />
                  {user.degree} • {user.college}
                </div>
              )}
              {user.phoneNumber && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  <span>{user.phoneNumber}</span>
                </div>
              )}
              {user.linkedinUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Linkedin className="size-3.5" />
                  <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
              {user.githubUrl && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Github className="size-3.5" />
                  <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    GitHub
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-border/60 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Branch/Dept</span>
                <span className="font-medium text-foreground">{user.branch || "Not specified"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Graduation Year</span>
                <span className="font-medium text-foreground">{user.graduationYear || "Not specified"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>CGPA / Grade</span>
                <span className="font-medium text-violet-400 font-mono">{user.cgpa ? `${user.cgpa} / 10` : "Not specified"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Account Created</span>
                <span className="font-medium text-foreground">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-md backdrop-blur">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-4">
              <ShieldCheck className="size-4 text-violet-400" />
              Change Password
            </div>
            <div className="space-y-3">
              {/* Step 1: Send verification code */}
              {(!codeSent && !codeVerified) && (
                <Button
                  type="button"
                  onClick={handleSendCode}
                  disabled={updatingPassword}
                  variant="outline"
                  className="w-full text-xs h-9"
                >
                  {updatingPassword ? <Loader2 className="size-3.5 animate-spin" /> : 'Send verification code'}
                </Button>
              )}

              {/* Step 2: Verify code */}
              {codeSent && !codeVerified && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground">Verification Code</Label>
                  <Input
                    placeholder="6‑digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={updatingPassword}
                    className="bg-background/50 text-xs h-9"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={updatingPassword}
                    variant="outline"
                    className="w-full text-xs h-9"
                  >
                    {updatingPassword ? <Loader2 className="size-3.5 animate-spin" /> : 'Verify code'}
                  </Button>
                </div>
              )}

              {/* Step 3: Change password */}
              {codeVerified && (
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Current Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      disabled={updatingPassword}
                      className="bg-background/50 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">New Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      disabled={updatingPassword}
                      className="bg-background/50 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.confirmNewPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
                      }
                      disabled={updatingPassword}
                      className="bg-background/50 text-xs h-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={updatingPassword}
                    variant="outline"
                    className="w-full text-xs h-9 gap-1.5 border-border/80 hover:border-violet-500/50"
                  >
                    {updatingPassword ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                    Update Password
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Column: Edit Profile & Interview History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Edit Profile Information */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 shadow-md backdrop-blur">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Profile Information</h3>
                <p className="text-xs text-muted-foreground">Update your account details</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-username" className="text-xs font-medium flex items-center justify-between">
                    <span>Username</span>
                    <span className="text-[10px] text-violet-400 font-mono">Unique Identifier</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">@</span>
                    <Input
                      id="edit-username"
                      placeholder="john_doe"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value.toLowerCase().replace(/\s+/g, "") })}
                      disabled={updatingProfile}
                      className="bg-background/50 text-sm pl-7 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs font-medium">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm"
                  />
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="edit-college" className="text-xs font-medium">
                    College / University
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-college"
                      placeholder="Search college or university (e.g. Stanford, MIT, IIT)..."
                      value={profileForm.college}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, college: e.target.value });
                        handleCollegeInputChange(e.target.value);
                      }}
                      onFocus={() => setShowCollegeDropdown(true)}
                      disabled={updatingProfile}
                      className="bg-background/50 text-sm"
                    />
                    {showCollegeDropdown && (collegeDbResults.length > 0 || collegeAiSuggestions.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f14] border border-border/80 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs backdrop-blur-xl">
                        {collegeDbResults.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                            </p>
                            {collegeDbResults.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => selectCollege(c)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}

                        {collegeAiSuggestions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <Sparkles className="size-3" /> AI Recommended Colleges
                            </p>
                            {collegeAiSuggestions.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => selectCollege(c)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                              >
                                <span>{c}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <Label htmlFor="edit-branch" className="text-xs font-medium">Branch / Department</Label>
                  <div className="relative">
                    <Input
                      id="edit-branch"
                      placeholder="Search branch or department (e.g. Computer Science)..."
                      value={profileForm.branch}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, branch: e.target.value });
                        handleBranchInputChange(e.target.value);
                      }}
                      onFocus={() => setShowBranchDropdown(true)}
                      disabled={updatingProfile}
                      className="bg-background/50 text-sm"
                    />
                    {showBranchDropdown && (branchDbResults.length > 0 || branchAiSuggestions.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f14] border border-border/80 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs backdrop-blur-xl">
                        {branchDbResults.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                            </p>
                            {branchDbResults.map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => selectBranch(b)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        )}

                        {branchAiSuggestions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <Sparkles className="size-3" /> Recommended Branches
                            </p>
                            {branchAiSuggestions.map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => selectBranch(b)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                              >
                                <span>{b}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <Label htmlFor="edit-degree" className="text-xs font-medium">Degree</Label>
                  <div className="relative">
                    <Input
                      id="edit-degree"
                      placeholder="Search degree (e.g. B.Tech, M.S., Ph.D.)..."
                      value={profileForm.degree}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, degree: e.target.value });
                        handleDegreeInputChange(e.target.value);
                      }}
                      onFocus={() => setShowDegreeDropdown(true)}
                      disabled={updatingProfile}
                      className="bg-background/50 text-sm"
                    />
                    {showDegreeDropdown && (degreeDbResults.length > 0 || degreeAiSuggestions.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f14] border border-border/80 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-2 text-xs backdrop-blur-xl">
                        {degreeDbResults.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-emerald-400"></span> Database Matches
                            </p>
                            {degreeDbResults.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => selectDegree(d)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        )}

                        {degreeAiSuggestions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2.5 py-1 font-mono flex items-center gap-1">
                              <Sparkles className="size-3" /> Recommended Degrees
                            </p>
                            {degreeAiSuggestions.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => selectDegree(d)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
                              >
                                <span>{d}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-grad" className="text-xs font-medium">Graduation Year</Label>
                  <Input
                    id="edit-grad"
                    type="date"
                    placeholder="Select graduation date"
                    value={profileForm.graduationYear}
                    onChange={(e) => setProfileForm({ ...profileForm, graduationYear: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cgpa" className="text-xs font-medium flex items-center justify-between">
                    <span>CGPA / Grade</span>
                    <span className="text-[10px] text-violet-400 font-mono">Out of 10.0</span>
                  </Label>
                  <Input
                    id="edit-cgpa"
                    placeholder="e.g. 8.5"
                    value={profileForm.cgpa}
                    onChange={(e) => setProfileForm({ ...profileForm, cgpa: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs font-medium">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-linkedin" className="text-xs font-medium">LinkedIn URL</Label>
                  <Input
                    id="edit-linkedin"
                    value={profileForm.linkedinUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-github" className="text-xs font-medium">GitHub URL</Label>
                  <Input
                    id="edit-github"
                    value={profileForm.githubUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                    disabled={updatingProfile}
                    className="bg-background/50 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updatingProfile}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs gap-1.5 px-5"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
