import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100/api';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for file downloads (without /api prefix)
export const FILE_BASE_URL = API_BASE_URL.replace('/api', '');

export const axiosFileInstance = axios.create({
  baseURL: FILE_BASE_URL,
  headers: {
    'Accept': '*/*',
  },
});

// Request interceptor to inject token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear token and redirect on 401 (Unauthorized) - invalid or expired token
    // 403 (Forbidden) means valid auth but insufficient permissions - do not log user out
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

