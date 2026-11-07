import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

// Explicitly use localhost to prevent 127.0.0.1 cross-origin CORS mismatches
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('finos_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('finos_access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function handleApiError(err: any): string {
  try {
    if (!err) return 'An unknown error occurred.';
    if (typeof err === 'string') return err;
    const data = err.response?.data || err.data || err;
    if (typeof data === 'string') return data;
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((item: any) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item))).join(' | ');
      }
      return JSON.stringify(data.detail);
    }
    return data?.message || err.message || JSON.stringify(data);
  } catch {
    return 'An error occurred while processing response.';
  }
}
