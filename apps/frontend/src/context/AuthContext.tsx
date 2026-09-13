import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type UserProfile,
  type SignupData,
  type LoginData,
  type UpdateProfileData,
  type ChangePasswordData,
  signupUser,
  loginUser,
  fetchProfile,
  updateProfile as updateProfileApi,
  changeUserPassword as changePasswordApi,
  logoutUser,
  googleLogin as googleLoginApi,
  githubLogin as githubLoginApi,
  linkedinLogin as linkedinLoginApi,
  sendEmailOtp as sendEmailOtpApi,
  verifyEmailOtp as verifyEmailOtpApi,
  sendPhoneOtp as sendPhoneOtpApi,
  verifyPhoneOtp as verifyPhoneOtpApi,
} from "../services/authService";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<UserProfile | undefined>;
  googleLogin: (credential: string, clientId?: string) => Promise<UserProfile | undefined>;
  githubLogin: (code: string) => Promise<UserProfile | undefined>;
  linkedinLogin: (code: string, redirectUri: string) => Promise<UserProfile | undefined>;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; message: string; dev_otp?: string }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<UserProfile | undefined>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message: string; dev_otp?: string }>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<UserProfile | undefined>;
  signup: (data: SignupData) => Promise<UserProfile | undefined>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state on initial load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const res = await fetchProfile();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem("user", JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn("Stored session expired or invalid");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    loadUser();
  }, []);

  async function login(data: LoginData) {
    setIsLoading(true);
    try {
      const response = await loginUser(data);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function googleLogin(credential: string, clientId?: string) {
    setIsLoading(true);
    try {
      const response = await googleLoginApi(credential, clientId);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function githubLogin(code: string) {
    setIsLoading(true);
    try {
      const response = await githubLoginApi(code);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function linkedinLogin(code: string, redirectUri: string) {
    setIsLoading(true);
    try {
      const response = await linkedinLoginApi(code, redirectUri);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function sendEmailOtp(email: string) {
    return await sendEmailOtpApi(email);
  }

  async function verifyEmailOtp(email: string, otp: string) {
    setIsLoading(true);
    try {
      const response = await verifyEmailOtpApi(email, otp);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function sendPhoneOtp(phone: string) {
    return await sendPhoneOtpApi(phone);
  }

  async function verifyPhoneOtp(phone: string, otp: string) {
    setIsLoading(true);
    try {
      const response = await verifyPhoneOtpApi(phone, otp);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signup(data: SignupData) {
    setIsLoading(true);
    try {
      const response = await signupUser(data);
      if (response.token && response.user) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        return response.user;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      await logoutUser();
    } catch {
      // Ignore API logout error
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  }

  async function updateUser(data: UpdateProfileData) {
    const response = await updateProfileApi(data);
    if (response.success && response.user) {
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
    }
  }

  async function changePassword(data: ChangePasswordData) {
    await changePasswordApi(data);
  }

  async function refreshProfile() {
    if (!token) return;
    const res = await fetchProfile();
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        googleLogin,
        githubLogin,
        linkedinLogin,
        sendEmailOtp,
        verifyEmailOtp,
        sendPhoneOtp,
        verifyPhoneOtp,
        signup,
        logout,
        updateUser,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
