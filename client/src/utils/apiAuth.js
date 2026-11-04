import axios from "axios";
import { getAuthorizationHeader, getStoredAdmin } from "./authStorage";

axios.interceptors.request.use((config) => {
  const requestUrl = new URL(config.url || "", config.baseURL || window.location.href);
  if (
    ["http://localhost:5001", "http://127.0.0.1:5001"].includes(requestUrl.origin)
  ) {
    const authorization = getAuthorizationHeader();
    if (authorization) {
      config.headers.Authorization = authorization;
    }
  }
  return config;
});

axios.interceptors.response.use(undefined, (error) => {
  if (
    error.response?.status === 401 &&
    error.config?.headers?.Authorization &&
    getStoredAdmin()
  ) {
    localStorage.removeItem("admin");
    window.location.assign("/Signin");
  }
  return Promise.reject(error);
});
