export const BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:3003";

export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
  "1042824120759-04prrgktoumo9aagnqr2602077u7j368.apps.googleusercontent.com";

export const GITHUB_CLIENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GITHUB_CLIENT_ID) ||
  "Ov23liOQrUs4pgCDXvny";