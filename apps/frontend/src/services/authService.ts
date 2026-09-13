import api from "./api";

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  college?: string;
  branch?: string;
  degree?: string;
  graduationYear?: string;
  profilePicture?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  fullName?: string;
  college?: string;
  branch?: string;
  degree?: string;
  graduationYear?: string;
  cgpa?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phoneNumber?: string;
  profilePicture?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  fullName: string;
  email: string;
  college?: string;
  branch?: string;
  degree?: string;
  graduationYear?: string;
  cgpa?: string;
  profilePicture?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phoneNumber?: string;
  xp?: number;
  streakDays?: number;
  badges?: string[];
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserProfile;
}

export async function signupUser(data: SignupData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/signup", data);
  return response.data;
}

export async function loginUser(data: LoginData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/login", data);
  return response.data;
}

export async function fetchProfile(): Promise<{ success: boolean; user: UserProfile }> {
  const response = await api.get<{ success: boolean; user: UserProfile }>("/api/auth/profile");
  return response.data;
}

export async function updateProfile(data: UpdateProfileData): Promise<{ success: boolean; user: UserProfile }> {
  const response = await api.put<{ success: boolean; user: UserProfile }>("/api/auth/profile", data);
  return response.data;
}

export async function changeUserPassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
  const response = await api.put<{ success: boolean; message: string }>("/api/auth/change-password", data);
  return response.data;
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await api.post<{ success: boolean; message: string }>("/api/auth/logout");
    return response.data;
  } catch {
    return { success: true, message: "Logged out locally" };
  }
}

export async function googleLogin(credential: string, clientId?: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/google", { credential, clientId });
  return response.data;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; dev_link?: string }> {
  const response = await api.post<{ success: boolean; message: string; dev_link?: string }>("/api/auth/forgot-password", { email });
  return response.data;
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  const response = await api.put<{ success: boolean; message: string }>(`/api/auth/reset-password/${token}`, { password });
  return response.data;
}

export async function githubLogin(code: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/github", { code });
  return response.data;
}

export async function linkedinLogin(code: string, redirectUri: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/linkedin", { code, redirectUri });
  return response.data;
}

export async function sendEmailOtp(email: string): Promise<{ success: boolean; message: string; dev_otp?: string }> {
  const response = await api.post<{ success: boolean; message: string; dev_otp?: string }>("/api/auth/send-email-otp", { email });
  return response.data;
}

export async function verifyEmailOtp(email: string, otp: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/verify-email-otp", { email, otp });
  return response.data;
}

export async function sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string; dev_otp?: string }> {
  const response = await api.post<{ success: boolean; message: string; dev_otp?: string }>("/api/auth/send-phone-otp", { phone });
  return response.data;
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/verify-phone-otp", { phone, otp });
  return response.data;
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; url: string; user: UserProfile }> {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await api.post<{ success: boolean; url: string; user: UserProfile }>("/api/auth/upload-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export interface LeaderboardItem {
  id: string;
  fullName: string;
  username?: string;
  xp: number;
  profilePicture?: string;
}

export async function fetchLeaderboardApi(): Promise<{ success: boolean; leaderboard: LeaderboardItem[] }> {
  const response = await api.get<{ success: boolean; leaderboard: LeaderboardItem[] }>("/api/auth/leaderboard");
  return response.data;
}

