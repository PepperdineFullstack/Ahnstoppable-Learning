// src/api/axios.js
// Pre-configured Axios instance.
// Automatically attaches the JWT from localStorage to every request.

import axios from 'axios';

// Single source of truth for the backend URL (REST + sockets)
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
});

// ── Request interceptor: attach token ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid – clear storage and redirect to sign-in
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;