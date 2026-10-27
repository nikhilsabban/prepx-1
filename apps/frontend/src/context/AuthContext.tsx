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

  const login = React.useCallback(async (data: LoginData) => {
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
  }, []);

  const googleLogin = React.useCallback(async (credential: string, clientId?: string) => {
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
  }, []);

  const githubLogin = React.useCallback(async (code: string) => {
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
  }, []);

  const linkedinLogin = React.useCallback(async (code: string, redirectUri: string) => {
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
  }, []);

  const sendEmailOtp = React.useCallback(async (email: string) => {
    return await sendEmailOtpApi(email);
  }, []);

  const verifyEmailOtp = React.useCallback(async (email: string, otp: string) => {
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
  }, []);

  const signup = React.useCallback(async (data: SignupData) => {
    setIsLoading(true);
    try {
      const response = await signupUser(data);
      // Do not store token or auto-login unverified accounts upon signup
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
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
  }, []);

  const updateUser = React.useCallback(async (data: UpdateProfileData) => {
    const response = await updateProfileApi(data);
    if (response.success && response.user) {
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
    }
  }, []);

  const changePassword = React.useCallback(async (data: ChangePasswordData) => {
    await changePasswordApi(data);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;
    const res = await fetchProfile();
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
  }, []);

  const authContextValue = React.useMemo<AuthContextType>(
    () => ({
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
      signup,
      logout,
      updateUser,
      changePassword,
      refreshProfile,
    }),
    [
      user,
      token,
      isLoading,
      login,
      googleLogin,
      githubLogin,
      linkedinLogin,
      sendEmailOtp,
      verifyEmailOtp,
      signup,
      logout,
      updateUser,
      changePassword,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
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
