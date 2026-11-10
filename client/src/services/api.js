import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stockflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register');

      if (!isAuthRoute) {
        localStorage.removeItem('stockflow_token');
        localStorage.removeItem('stockflow_user');
        window.dispatchEvent(new Event('stockflow:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;

