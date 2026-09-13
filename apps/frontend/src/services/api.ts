import axios from "axios";
import { BACKEND_URL } from "../lib/config";

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Clear token if session expired on protected endpoints
      const isAuthEndpoint = error.config?.url?.includes("/api/auth/login") || 
                             error.config?.url?.includes("/api/auth/signup");
      if (!isAuthEndpoint && localStorage.getItem("token")) {
        console.warn("Unauthorized token detected. Please sign in again.");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
