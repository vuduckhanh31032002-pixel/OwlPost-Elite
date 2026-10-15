import axios from "axios";

const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:8081";

const API = axios.create({
  baseURL: `${BACKEND_ORIGIN.replace(/\/$/, "")}/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
