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
    cssCodeSplit: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("mermaid")) return "vendor-mermaid";
            if (id.includes("cytoscape")) return "vendor-cytoscape";
            if (id.includes("katex")) return "vendor-katex";
            if (id.includes("@monaco-editor") || id.includes("monaco-editor")) return "vendor-monaco";
            if (id.includes("framer-motion")) return "vendor-framer";
            if (id.includes("react-markdown") || id.includes("remark-gfm")) return "vendor-markdown";
            if (id.includes("canvas-confetti")) return "vendor-confetti";
            if (id.includes("@react-oauth")) return "vendor-oauth";
            if (id.includes("react-toastify")) return "vendor-toastify";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (
              id.includes("react-router") ||
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
});
