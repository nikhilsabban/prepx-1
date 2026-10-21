import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts raw errors (Axios, Network, Server, Groq) into student-friendly text.
 * Technical errors are sanitized so internal details are never leaked to the user.
 */
export function getErrorMessage(error: any, fallback: string = "Something went wrong. Please try again."): string {
  if (!error) return fallback;

  // Log full technical details to console for debugging
  console.error("[PrepX API Error Details]:", error);

  // Network / Offline error
  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "Couldn't connect right now. Check your internet connection and try again.";
  }

  // Timeout
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "That took longer than expected. Please try again.";
  }

  const status = error.response?.status;
  const rawMsg = error.response?.data?.message || error.response?.data?.error || error.message;

  // Check if raw message exists and is clean (non-technical) first
  if (typeof rawMsg === "string" && rawMsg.trim()) {
    const isTechnical = /mongo|groq|jwt|axios|e11000|typeerror|syntaxerror|status code|500|429|cast to objectid|unhandled|stack|trace|express|cors/i.test(rawMsg);
    if (!isTechnical && rawMsg.length < 150) {
      if (/invalid email or password|incorrect email|invalid credentials|user not found/i.test(rawMsg)) {
        return "Email or password is wrong. Please verify it and try again.";
      }
      return rawMsg;
    }
  }

  // Status code based fallback
  if (status === 401) {
    return "Email or password is wrong. Please verify it and try again.";
  }
  if (status === 403) {
    return "You don't have permission to access this resource.";
  }
  if (status === 429) {
    return "You're sending requests a little too quickly. Please try again in a moment.";
  }
  if (status >= 500) {
    return "Something went wrong on our side. Please try again.";
  }

  return fallback;
}

