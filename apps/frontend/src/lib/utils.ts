import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts raw errors (Axios, Network, Server, Groq, MongoDB, Auth) into friendly, polished human text.
 * Technical errors and backend internal details are rigorously sanitized so server details are never leaked.
 */
export function getErrorMessage(error: any, fallback: string = "Something went wrong. Please try again."): string {
  if (!error) return fallback;

  // Network / Offline error
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  // Timeout
  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return "Request took a little too long. Please try again in a moment.";
  }

  const status = error?.response?.status;
  const rawMsg =
    typeof error === "string"
      ? error
      : error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "";

  // Check if raw message contains technical leaks, stack traces, or internal keywords
  if (typeof rawMsg === "string" && rawMsg.trim()) {
    const isTechnical =
      /mongo|groq|jwt|token expired|token invalid|axios|e11000|typeerror|referenceerror|syntaxerror|status code|500|502|503|504|429|cast to|objectid|unhandled|stack|trace|express|cors|localhost|http:\/\/|https:\/\/|at async|node_modules|internal server|payload|undefined|null|\[object object\]|cloud console|authorized javascript origins/i.test(
        rawMsg
      );

    if (!isTechnical && rawMsg.length < 120) {
      if (/invalid email or password|incorrect email|invalid credentials|user not found|wrong password/i.test(rawMsg)) {
        return "Email or password is incorrect. Please verify and try again.";
      }
      if (/user already exists|email already in use|account already registered/i.test(rawMsg)) {
        return "An account with this email already exists. Please log in.";
      }
      if (/username already taken/i.test(rawMsg)) {
        return "This username is already taken. Please choose another handle.";
      }
      return rawMsg;
    }
  }

  // Status code based friendly fallback
  if (status === 400) {
    return fallback || "Invalid request. Please check your inputs and try again.";
  }
  if (status === 401) {
    return "Your session has expired or credentials are invalid. Please sign in again.";
  }
  if (status === 403) {
    return "You don't have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested resource could not be found.";
  }
  if (status === 429) {
    return "You're sending requests too quickly. Please pause a moment and try again.";
  }
  if (status && status >= 500) {
    return "Our service is temporarily busy. Please try again shortly.";
  }

  return fallback;
}

