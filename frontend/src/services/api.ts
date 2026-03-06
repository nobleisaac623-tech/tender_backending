import axios, { type AxiosError } from 'axios';

function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

  // If VITE_API_BASE_URL is set, use it (for Vercel or production)
  if (raw) return raw;

  // Dev defaults to Vite proxy (/api). When serving built app from Apache/XAMPP,
  // /api is typically not proxied—use the real backend path instead.
  if (import.meta.env.DEV) return '/api';
  return '/suppy_tender/backend/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string }>) => {
    const message = err.response?.data?.message ?? err.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
