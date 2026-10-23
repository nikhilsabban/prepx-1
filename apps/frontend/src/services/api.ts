import axios from "axios";
import { BACKEND_URL } from "../lib/config";

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function isFormData(data: unknown): boolean {
  return typeof FormData !== "undefined" && data instanceof FormData;
}

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set multipart/form-data with the correct boundary.
    if (isFormData(config.data) && config.headers) {
      if (typeof (config.headers as any).delete === "function") {
        (config.headers as any).delete("Content-Type");
      } else {
        delete (config.headers as any)["Content-Type"];
        delete (config.headers as any)["content-type"];
      }
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
