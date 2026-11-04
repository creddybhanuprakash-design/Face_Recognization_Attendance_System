import axios from "axios";
import { getAuthorizationHeader, getStoredAdmin } from "./authStorage";
import { API_ORIGIN } from "./apiConfig";

axios.interceptors.request.use((config) => {
  const requestUrl = new URL(config.url || "", config.baseURL || window.location.href);
  if (requestUrl.origin === API_ORIGIN) {
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
