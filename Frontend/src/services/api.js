import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  timeout: 10000,
});

export default api;

// Fetch current session-bound protection before each mutation (also works across tabs/login rotation).
api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes((config.method || "get").toLowerCase())) {
    const response = await api.get("/auth/csrf");
    config.headers["X-CSRF-Token"] = response.data.data.csrfToken;
  }
  return config;
});
api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  if (error.response?.status === 403 && error.response.data?.code === "CSRF_INVALID" && !config?._csrfRetried) {
    return api({ ...config, _csrfRetried: true });
  }
  return Promise.reject(error);
});
