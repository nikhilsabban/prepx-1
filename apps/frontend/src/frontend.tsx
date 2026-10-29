import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "./lib/config";

// Global auto-recovery for stale dynamic chunks after new deployments
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Vite chunk preload error detected (new deployment). Reloading page...", event);
  const reloaded = sessionStorage.getItem("chunk_reload_lock");
  if (!reloaded) {
    sessionStorage.setItem("chunk_reload_lock", "true");
    window.location.reload();
  }
});

// Clear reload lock once page loads cleanly
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem("chunk_reload_lock"), 5000);
});

const elem = document.getElementById("root")!;
const hasGoogleClientId = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "MOCK_CLIENT_ID";

const app = hasGoogleClientId ? (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
