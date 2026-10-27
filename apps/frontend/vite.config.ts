import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "process.env": {},
    "process": { env: {} },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "styles": path.resolve(__dirname, "./styles"),
      "next/link": path.resolve(__dirname, "./src/coding/compat/link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/coding/compat/navigation.ts"),
    },
  },
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3003",
        changeOrigin: true,
      },
      "/coding-module": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coding-module/, ""),
      },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
});
