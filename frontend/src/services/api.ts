import axios, { type AxiosError } from 'axios';

function resolveApiBaseUrl(): string {
  // Primary: Use VITE_API_URL from environment (set in Vercel)
  const envUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
  if (envUrl) return envUrl;

  // Fallback: Use VITE_API_BASE_URL if set
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (baseUrl) return baseUrl;

  // Development: Use localhost
  if (import.meta.env.DEV) return 'http://localhost:8080/api';

  // Production fallback (should not reach here if env vars are set)
  return 'http://localhost:8080/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// REQUEST INTERCEPTOR: Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;

    // Handle authentication errors
    if (status === 401 || status === 403) {
      // Clear auth data only if not already cleared
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login only if we're not already there
        const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
        if (!isLoginPage) {
          window.location.href = '/login';
        }
      }

      // Don't retry 401/403 requests
      return Promise.reject(error);
    }

    // Handle other errors normally
    const message = error.response?.data?.message ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
