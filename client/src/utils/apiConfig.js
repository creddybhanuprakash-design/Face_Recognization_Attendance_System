const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"
);

export const FACE_API_URL = trimTrailingSlash(
  import.meta.env.VITE_FACE_API_URL || "http://localhost:5000"
);

export const API_ORIGIN = new URL(API_BASE_URL).origin;